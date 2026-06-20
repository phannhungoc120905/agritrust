use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct ConfirmReceipt<'info> {
    pub buyer: Signer<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub seller: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref()],
        bump = escrow_account.bump,
        constraint = escrow_account.status == EscrowStatus::Locked @ EscrowError::NotLocked
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
}

pub fn handler(ctx: Context<ConfirmReceipt>) -> Result<()> {
    let escrow_account = &mut ctx.accounts.escrow_account;
    escrow_account.status = EscrowStatus::Resolved;

    msg!("Giao dịch hoàn tất. Giải ngân 100% tiền cho người bán.");
    Ok(())
}
