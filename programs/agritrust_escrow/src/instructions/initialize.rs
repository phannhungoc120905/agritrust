use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Only used as the seller identity and token authority.
    pub seller: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = buyer,
        space = EscrowAccount::LEN,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(
        init,
        payer = buyer,
        token::mint = mint,
        token::authority = escrow_account,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<Initialize>,
    unit_price: u64,
    expected_qty: u64,
    deadline: i64,
    seller: Pubkey,
) -> Result<()> {
    require_keys_eq!(ctx.accounts.seller.key(), seller, EscrowError::SellerMismatch);

    let total_amount = unit_price
        .checked_mul(expected_qty)
        .ok_or(EscrowError::MathOverflow)?;

    let transfer_accounts = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
    );
    token::transfer(transfer_ctx, total_amount)?;

    let escrow_account = &mut ctx.accounts.escrow_account;
    escrow_account.buyer = ctx.accounts.buyer.key();
    escrow_account.seller = seller;
    escrow_account.mint = ctx.accounts.mint.key();
    escrow_account.buyer_token_account = ctx.accounts.buyer_token_account.key();
    escrow_account.seller_token_account = ctx.accounts.seller_token_account.key();
    escrow_account.vault = ctx.accounts.vault.key();
    escrow_account.unit_price = unit_price;
    escrow_account.expected_qty = expected_qty;
    escrow_account.deadline = deadline;
    escrow_account.total_amount = total_amount;
    escrow_account.status = EscrowStatus::Locked;
    escrow_account.bump = ctx.bumps.escrow_account;
    escrow_account.vault_bump = ctx.bumps.vault;

    msg!(
        "Escrow locked. buyer={}, seller={}, amount={}, expected_qty={}",
        escrow_account.buyer,
        escrow_account.seller,
        total_amount,
        expected_qty
    );
    Ok(())
}
