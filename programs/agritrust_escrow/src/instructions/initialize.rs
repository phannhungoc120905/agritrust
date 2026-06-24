use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::errors::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Thương lái — người khóa tiền, ký transaction, trả phí gas
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Nông dân — chỉ dùng làm identity, không cần sign ở bước này
    pub seller: UncheckedAccount<'info>,

    /// Escrow PDA: lưu metadata + chứa native SOL bị khóa
    /// Seeds = [b"escrow", buyer, seller] để tránh collision
    #[account(
        init,
        payer = buyer,
        space = EscrowAccount::LEN,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    unit_price: u64,
    expected_qty: u64,
    deadline: i64,
    seller: Pubkey,
) -> Result<()> {
    // Validate seller address khớp với account được truyền vào
    require_keys_eq!(
        ctx.accounts.seller.key(),
        seller,
        EscrowError::SellerMismatch
    );

    // Tính tổng lamports cần khóa
    let total_lamports = unit_price
        .checked_mul(expected_qty)
        .ok_or(EscrowError::MathOverflow)?;

    // Transfer SOL từ buyer → escrow PDA (system_program CPI)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
            },
        ),
        total_lamports,
    )?;

    // Lưu metadata vào PDA
    let escrow = &mut ctx.accounts.escrow_account;
    escrow.buyer = ctx.accounts.buyer.key();
    escrow.seller = seller;
    escrow.unit_price = unit_price;
    escrow.expected_qty = expected_qty;
    escrow.deadline = deadline;
    escrow.total_lamports = total_lamports;
    escrow.status = EscrowStatus::Locked;
    escrow.bump = ctx.bumps.escrow_account;

    msg!(
        "✅ Escrow locked. buyer={}, seller={}, total_lamports={}, expected_qty={}",
        escrow.buyer,
        escrow.seller,
        total_lamports,
        expected_qty
    );

    Ok(())
}
