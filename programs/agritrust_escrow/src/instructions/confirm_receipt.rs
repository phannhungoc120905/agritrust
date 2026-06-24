use anchor_lang::prelude::*;

use crate::errors::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct ConfirmReceipt<'info> {
    /// Thương lái ký xác nhận đã nhận đủ hàng
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Nông dân — người nhận SOL được giải ngân
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,

    /// Escrow PDA: drain lamports → seller, sau đó close về buyer
    #[account(
        mut,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref()],
        bump = escrow_account.bump,
        has_one = buyer,
        has_one = seller,
        constraint = escrow_account.status == EscrowStatus::Locked @ EscrowError::NotLocked,
        close = buyer   // Sau khi giải ngân, rent lamports về tay buyer
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ConfirmReceipt>) -> Result<()> {
    let amount = ctx.accounts.escrow_account.total_lamports;

    // Transfer lamports từ escrow PDA → seller
    // Dùng raw lamport manipulation (pattern chuẩn cho PDA → wallet)
    **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += amount;

    // Đánh dấu đã resolved (trước khi `close` xóa account)
    ctx.accounts.escrow_account.status = EscrowStatus::Resolved;

    msg!(
        "✅ Escrow confirmed. Seller received {} lamports.",
        amount
    );

    Ok(())
}
