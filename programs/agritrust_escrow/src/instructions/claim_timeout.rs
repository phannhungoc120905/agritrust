use anchor_lang::prelude::*;

use crate::errors::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimTimeout<'info> {
    /// CHECK: Thương lái — người phải trả phí giao dịch (buyer ký vì họ gọi)
    /// Thực tế nông dân cũng có thể gọi hàm này sau deadline
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,

    /// Nông dân ký — nhận toàn bộ SOL sau khi hết deadline
    #[account(mut)]
    pub seller: Signer<'info>,

    /// Escrow PDA: drain toàn bộ lamports → seller, sau đó close về buyer
    #[account(
        mut,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref()],
        bump = escrow_account.bump,
        has_one = buyer,
        has_one = seller,
        constraint = escrow_account.status == EscrowStatus::Locked @ EscrowError::NotLocked,
        constraint = Clock::get()?.unix_timestamp >= escrow_account.deadline @ EscrowError::DeadlineNotPassed,
        close = buyer  // Rent về buyer sau khi drain
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimTimeout>) -> Result<()> {
    let amount = ctx.accounts.escrow_account.total_lamports;

    // Transfer toàn bộ lamports từ escrow PDA → seller
    **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += amount;

    ctx.accounts.escrow_account.status = EscrowStatus::TimedOut;

    msg!(
        "✅ Escrow timed out. Seller claimed {} lamports.",
        amount
    );

    Ok(())
}
