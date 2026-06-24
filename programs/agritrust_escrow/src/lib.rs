use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("B9UVTiJQx8ftRob2oFQ5gSGQB6yraPX5UjAczyvqSYEU");

#[program]
pub mod agritrust_escrow {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        unit_price: u64,
        expected_qty: u64,
        deadline: i64,
        seller: Pubkey,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, unit_price, expected_qty, deadline, seller)
    }

    pub fn confirm_receipt(ctx: Context<ConfirmReceipt>) -> Result<()> {
        instructions::confirm_receipt::handler(ctx)
    }

    pub fn resolve_partial(ctx: Context<ResolvePartial>, actual_qty: u64) -> Result<()> {
        instructions::resolve_partial::handler(ctx, actual_qty)
    }

    pub fn claim_timeout(ctx: Context<ClaimTimeout>) -> Result<()> {
        instructions::claim_timeout::handler(ctx)
    }
}
