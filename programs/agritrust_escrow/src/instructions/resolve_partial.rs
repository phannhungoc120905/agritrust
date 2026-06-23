use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct ResolvePartial<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Checked by escrow PDA seeds and has_one constraint.
    pub seller: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref(), mint.key().as_ref()],
        bump = escrow_account.bump,
        has_one = buyer,
        has_one = seller,
        has_one = mint,
        constraint = escrow_account.status == EscrowStatus::Locked @ EscrowError::NotLocked,
        constraint = escrow_account.buyer_token_account == buyer_token_account.key(),
        constraint = escrow_account.seller_token_account == seller_token_account.key(),
        constraint = escrow_account.vault == vault.key()
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ResolvePartial>, actual_qty: u64) -> Result<()> {
    let escrow_account = &mut ctx.accounts.escrow_account;

    require!(
        actual_qty <= escrow_account.expected_qty,
        EscrowError::InvalidQuantity
    );

    let payout = escrow_account
        .unit_price
        .checked_mul(actual_qty)
        .ok_or(EscrowError::MathOverflow)?;
    let refund = escrow_account
        .total_amount
        .checked_sub(payout)
        .ok_or(EscrowError::MathOverflow)?;

    let buyer_key = escrow_account.buyer;
    let seller_key = escrow_account.seller;
    let mint_key = escrow_account.mint;
    let bump = escrow_account.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"escrow",
        buyer_key.as_ref(),
        seller_key.as_ref(),
        mint_key.as_ref(),
        &[bump],
    ]];

    if payout > 0 {
        let transfer_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: escrow_account.to_account_info(),
        };
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );
        token::transfer(transfer_ctx, payout)?;
    }

    if refund > 0 {
        let transfer_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: escrow_account.to_account_info(),
        };
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );
        token::transfer(transfer_ctx, refund)?;
    }

    escrow_account.status = EscrowStatus::Resolved;
    msg!(
        "Escrow resolved partially. actual_qty={}, payout={}, refund={}",
        actual_qty,
        payout,
        refund
    );
    Ok(())
}
