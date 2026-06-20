use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct ClaimTimeout<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: Safe
    pub buyer: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref()],
        bump = escrow_account.bump,
        constraint = escrow_account.status == EscrowStatus::Locked @ EscrowError::NotLocked
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
}

pub fn handler(ctx: Context<ClaimTimeout>) -> Result<()> {
    let escrow_account = &mut ctx.accounts.escrow_account;
    
    // Kiểm tra xem thời gian hiện tại đã vượt qua deadline chưa
    let clock = Clock::get()?;
    if clock.unix_timestamp < escrow_account.deadline {
        return Err(EscrowError::DeadlineNotPassed.into());
    }

    escrow_account.status = EscrowStatus::TimedOut;

    msg!("Hợp đồng đã quá hạn giao nhận mà không có khiếu nại. Giải ngân toàn bộ tiền cho người bán.");
    Ok(())
}
