use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Hợp đồng không ở trạng thái khóa tiền.")]
    NotLocked,
    #[msg("Chưa đến thời hạn hết hạn giao hàng.")]
    DeadlineNotPassed,
    #[msg("Đã quá hạn giao hàng, không thể thực hiện giao dịch thông thường.")]
    DeadlinePassed,
    #[msg("Số lượng hàng nhận được lớn hơn số lượng dự kiến.")]
    InvalidQuantity,
}
