use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    Locked,
    Resolved,
    TimedOut,
}

/// Escrow account PDA — lưu metadata hợp đồng.
/// Native SOL (lamports) được giữ trực tiếp trong PDA account này.
#[account]
pub struct EscrowAccount {
    pub buyer: Pubkey,         // Địa chỉ ví thương lái (người mua)
    pub seller: Pubkey,        // Địa chỉ ví nông dân (người bán)
    pub unit_price: u64,       // Đơn giá (lamports / 1 đơn vị hàng)
    pub expected_qty: u64,     // Số lượng kỳ vọng
    pub deadline: i64,         // Unix timestamp deadline giao hàng
    pub total_lamports: u64,   // Tổng SOL bị khóa (lamports)
    pub status: EscrowStatus,  // Trạng thái escrow
    pub bump: u8,              // PDA bump seed
}

impl EscrowAccount {
    // 8 discriminator + 32 buyer + 32 seller + 8 unit_price + 8 expected_qty
    // + 8 deadline + 8 total_lamports + 1 status + 1 bump
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1;
}
