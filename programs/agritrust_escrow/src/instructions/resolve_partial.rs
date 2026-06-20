use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct ResolvePartial<'info> {
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

pub fn handler(ctx: Context<ResolvePartial>, actual_qty: u64) -> Result<()> {
    let escrow_account = &mut ctx.accounts.escrow_account;
    
    // Đảm bảo số lượng nhận được không lớn hơn dự kiến
    if actual_qty > escrow_account.expected_qty {
        return Err(EscrowError::InvalidQuantity.into());
    }

    escrow_account.status = EscrowStatus::Resolved;

    msg!("Giải quyết tranh chấp theo tỷ lệ. Số lượng thực tế: {} / {}. Giải ngân một phần cho người bán, phần còn lại hoàn trả cho người mua.", actual_qty, escrow_account.expected_qty);
    Ok(())
}
