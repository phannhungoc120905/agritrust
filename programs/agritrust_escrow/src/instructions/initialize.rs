use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Safe
    pub seller: AccountInfo<'info>,
    #[account(
        init,
        payer = buyer,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1,
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
    let escrow_account = &mut ctx.accounts.escrow_account;
    escrow_account.buyer = ctx.accounts.buyer.key();
    escrow_account.seller = seller;
    escrow_account.unit_price = unit_price;
    escrow_account.expected_qty = expected_qty;
    escrow_account.deadline = deadline;
    escrow_account.status = EscrowStatus::Locked;
    escrow_account.bump = ctx.bumps.escrow_account;

    msg!("Hợp đồng AgriTrust đã được khởi tạo và khóa. Người bán: {}, Giá: {}, Số lượng: {}", seller, unit_price, expected_qty);
    Ok(())
}
