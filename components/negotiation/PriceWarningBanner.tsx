'use client';

import React from 'react';

interface PriceWarningBannerProps {
  proposedPrice: number;
  referencePrice: number;
  productName: string;
}

export default function PriceWarningBanner({ proposedPrice, referencePrice, productName }: PriceWarningBannerProps) {
  // Nếu proposedPrice quá lớn (> 1.000.000, ví dụ đàm phán triệu đồng/tấn hoặc tổng giá trị),
  // ta chuẩn hóa về đồng/kg bằng cách chia cho 1.000 (quy đổi tấn -> kg) để so khớp với referencePrice.
  const normalizedProposed = proposedPrice > 1000000 ? proposedPrice / 1000 : proposedPrice;

  const percentageDiff = referencePrice > 0 ? ((normalizedProposed - referencePrice) / referencePrice) * 100 : 0;
  const isHigh = percentageDiff > 5;
  const isLow = percentageDiff < -5;

  if (proposedPrice === 0 || referencePrice === 0) return null;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-500 shadow-lg ${
        isLow 
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 animate-pulse'
          : isHigh
          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
        <div className="flex-1 text-sm">
          <p className="font-semibold">
            {isLow 
              ? '⚠️ CẢNH BÁO BỊ CHÈN ÉP: Giá đang thấp hơn thị trường!' 
              : isHigh 
              ? '⚠️ Lưu ý: Giá đàm phán đang cao hơn thị trường' 
              : '✅ Giá đàm phán hợp lý'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Sản phẩm: <span className="font-semibold text-white">{productName}</span> | 
            Giá đề xuất: <span className="font-semibold text-white">{normalizedProposed.toLocaleString('vi-VN')} đ/kg</span> | 
            Giá tham khảo: <span className="font-semibold text-white">{referencePrice.toLocaleString('vi-VN')} đ/kg</span>
          </p>
          {(isHigh || isLow) && (
            <p className={`text-[11px] font-medium mt-1.5 ${isLow ? 'text-rose-400' : 'text-amber-400'}`}>
              * Giá thương lượng đang lệch {Math.abs(Math.round(percentageDiff))}% so với giá cơ sở tại khu vực.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

