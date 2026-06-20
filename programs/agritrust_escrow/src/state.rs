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
    pub vault: Pubkey,
    pub unit_price: u64,
    pub expected_qty: u64,
    pub deadline: i64,
    pub status: EscrowStatus,
    pub bump: u8,
}
