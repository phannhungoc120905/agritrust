use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimTimeout<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: Checked by escrow PDA seeds and has_one constraint.
    pub buyer: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
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
        constraint = escrow_account.seller_token_account == seller_token_account.key(),
        constraint = escrow_account.vault == vault.key()
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimTimeout>) -> Result<()> {
    let escrow_account = &mut ctx.accounts.escrow_account;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp >= escrow_account.deadline,
        EscrowError::DeadlineNotPassed
    );

    let amount = ctx.accounts.vault.amount;
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
    token::transfer(transfer_ctx, amount)?;

    escrow_account.status = EscrowStatus::TimedOut;
    msg!("Escrow timed out. Seller received the locked amount.");
    Ok(())
}
