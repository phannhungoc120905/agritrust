use anchor_lang::prelude::*;

use crate::errors::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct ResolvePartial<'info> {
    /// Thương lái ký giải quyết tranh chấp theo tỷ lệ thực giao
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Nông dân — nhận phần tiền tương ứng hàng thực giao
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,

    /// Escrow PDA: chia lamports theo tỷ lệ, sau đó close
    #[account(
        mut,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref()],
        bump = escrow_account.bump,
        has_one = buyer,
        has_one = seller,
        constraint = escrow_account.status == EscrowStatus::Locked @ EscrowError::NotLocked,
        close = buyer  // Rent về buyer, buyer cũng nhận phần refund
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResolvePartial>, actual_qty: u64) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow_account;

    require!(
        actual_qty <= escrow.expected_qty,
        EscrowError::InvalidQuantity
    );

    // Tính payout (Lamports) vì escrow.unit_price đã được tính bằng Lamports từ Frontend
    let payout_lamports = escrow
        .unit_price
        .checked_mul(actual_qty)
        .ok_or(EscrowError::MathOverflow)?;

    let refund_lamports = escrow
        .total_lamports
        .checked_sub(payout_lamports)
        .ok_or(EscrowError::MathOverflow)?;

    // Trả lamports cho seller (phần hàng đã giao)
    if payout_lamports > 0 {
        **escrow.to_account_info().try_borrow_mut_lamports()? -= payout_lamports;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += payout_lamports;
    }

    // Refund lamports cho buyer (phần hàng thiếu)
    // Note: phần refund sẽ được xử lý thông qua `close = buyer` tự động,
    // nhưng ta set total_lamports để đảm bảo kế toán đúng
    // (phần còn lại trong PDA = refund + rent sẽ về buyer khi PDA close)

    escrow.status = EscrowStatus::Resolved;

    msg!(
        "✅ Escrow resolved partially. actual_qty={}, payout={} lamports, refund={} lamports.",
        actual_qty,
        payout_lamports,
        refund_lamports
    );

    Ok(())
}
