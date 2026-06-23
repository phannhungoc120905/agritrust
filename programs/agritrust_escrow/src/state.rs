use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    Locked,
    Resolved,
    TimedOut,
}

#[account]
pub struct EscrowAccount {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub buyer_token_account: Pubkey,
    pub seller_token_account: Pubkey,
    pub vault: Pubkey,
    pub unit_price: u64,
    pub expected_qty: u64,
    pub deadline: i64,
    pub total_amount: u64,
    pub status: EscrowStatus,
    pub bump: u8,
    pub vault_bump: u8,
}

impl EscrowAccount {
    pub const LEN: usize = 8 + (32 * 6) + (8 * 4) + 1 + 1 + 1;
}
