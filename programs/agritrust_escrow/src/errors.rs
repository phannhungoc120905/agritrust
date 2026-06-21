use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Escrow is not locked.")]
    NotLocked,
    #[msg("Delivery deadline has not passed.")]
    DeadlineNotPassed,
    #[msg("Delivery deadline already passed.")]
    DeadlinePassed,
    #[msg("Actual quantity is greater than expected quantity.")]
    InvalidQuantity,
    #[msg("Math overflow.")]
    MathOverflow,
    #[msg("Seller account does not match the seller argument.")]
    SellerMismatch,
}
