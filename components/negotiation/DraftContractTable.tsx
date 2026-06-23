'use client';

import React from 'react';
import { QualityRule } from '../../types/contract';
import { convertVndToUsdc } from '../../lib/solana/convertVndUsdc';
import { FileSignature, Stamp, CheckCircle2, Link2, Plus, Trash2 } from 'lucide-react';

interface DraftTerms {
  san_pham: string;
  so_luong: number;
  don_vi_tinh: string;
  don_gia: number;
  han_giao_hang: string;
  dieu_khoan_chat_luong: QualityRule[];
}

export interface ContractSignature {
  name: string;
  wallet: string;
  timestamp: string;
  txHash: string;
}

interface DraftContractTableProps {
  terms: DraftTerms;
  onChange: (updatedTerms: DraftTerms) => void;
  isLocked?: boolean;
  buyerName?: string;
  sellerName?: string;
  buyerSignature?: ContractSignature | null;
  sellerSignature?: ContractSignature | null;
  onSignBuyer?: (name: string) => Promise<void>;
  onSignSeller?: (name: string) => Promise<void>;
  isSigningBuyer?: boolean;
  isSigningSeller?: boolean;
  currentRole?: 'nong_dan' | 'thuong_lai';
  partnerTyping?: boolean;
  partnerCount?: number;
  isDemoCall?: boolean;
}

export default function DraftContractTable({ 
  terms, 
  onChange, 
  isLocked = false,
  buyerName = 'Người mua',
  sellerName = 'Người bán',
  buyerSignature,
  sellerSignature,
  onSignBuyer,
  onSignSeller,
  isSigningBuyer,
  isSigningSeller,
  currentRole,
  partnerTyping,
  partnerCount = 0,
  isDemoCall = false
}: DraftContractTableProps) {
  const [typedBuyerName, setTypedBuyerName] = React.useState('');
  const [typedSellerName, setTypedSellerName] = React.useState('');
  const handleInputChange = (field: keyof DraftTerms, value: any) => {
    onChange({ ...terms, [field]: value });
  };

  const handleQualityRuleChange = (index: number, field: keyof QualityRule, value: any) => {
    const newRules = [...(terms.dieu_khoan_chat_luong || [])];
    newRules[index] = { ...newRules[index], [field]: value };
    onChange({ ...terms, dieu_khoan_chat_luong: newRules });
  };

  const handleAddQualityRule = () => {
    const newRules = [...(terms.dieu_khoan_chat_luong || [])];
    newRules.push({
      tieu_chi: '',
      nguong_phan_tram: 0,
      muc_phat: ''
    });
    onChange({ ...terms, dieu_khoan_chat_luong: newRules });
  };

  const handleRemoveQualityRule = (index: number) => {
    const newRules = (terms.dieu_khoan_chat_luong || []).filter((_, idx) => idx !== index);
    onChange({ ...terms, dieu_khoan_chat_luong: newRules });
  };

  const soLuong = Number(terms.so_luong) || 0;
  const donGia = Number(terms.don_gia) || 0;
  const totalVnd = soLuong * donGia;
  const totalSol = convertVndToUsdc(totalVnd);

  return (
    <div className="font-serif bg-[#fdfdfc] text-slate-900 p-8 md:p-12 rounded shadow-lg border border-slate-300 relative mx-auto max-w-4xl">
      
      {/* WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
        <Stamp size={500} className="text-slate-900 rotate-[-15deg]" />
      </div>

      {/* TYPING INDICATOR */}
      {partnerTyping && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse shadow-sm border border-indigo-200">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
          Đối tác đang chỉnh sửa...
        </div>
      )}

      <div className="relative z-10">
        {/* HEADER */}
        <div className="text-center space-y-1 pb-6 mb-6 border-b-2 border-slate-800">
          <p className="text-sm md:text-base font-bold uppercase">Cộng hòa Xã hội Chủ nghĩa Việt Nam</p>
          <p className="text-sm md:text-base font-bold underline underline-offset-4 decoration-slate-800">Độc lập - Tự do - Hạnh phúc</p>
          <div className="pt-8">
            <h3 className="font-extrabold text-2xl uppercase tracking-wide">
              Hợp đồng Mua bán Nông sản
            </h3>
            <p className="text-sm text-slate-600 mt-2 italic">Số: {new Date().getFullYear()}/HĐMB/AGRITRUST-ST25</p>
          </div>
        </div>

        {/* CĂN CỨ VÀ NGÀY THÁNG */}
        <div className="text-base space-y-2 mb-8 italic text-slate-800 text-justify">
          <p>- Căn cứ Luật Thương mại số 36/2005/QH11 do Quốc hội nước CHXHCN Việt Nam ban hành;</p>
          <p>- Căn cứ Bộ luật Dân sự số 91/2015/QH13 do Quốc hội nước CHXHCN Việt Nam ban hành;</p>
          <p>- Căn cứ vào nhu cầu và khả năng thực tế của hai bên.</p>
          <p className="pt-4 not-italic font-medium text-slate-900">
            Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}, thông qua nền tảng bảo chứng hợp đồng thông minh AgriTrust, chúng tôi gồm có:
          </p>
        </div>

        {/* THÔNG TIN CÁC BÊN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-base">
          {/* BÊN A */}
          <div className="space-y-3">
            <h4 className="font-bold text-lg uppercase border-l-4 border-slate-800 pl-3">Bên Bán (Bên A)</h4>
            <div className="space-y-2">
              <div className="flex gap-2"><span className="font-semibold min-w-28">Tên đơn vị:</span> <span>Hợp tác xã Nông nghiệp Miền Tây</span></div>
              <div className="flex gap-2"><span className="font-semibold min-w-28">Địa chỉ:</span> <span>Huyện Trần Đề, Tỉnh Sóc Trăng</span></div>
              <div className="flex gap-2"><span className="font-semibold min-w-28">Mã số thuế:</span> <span>2200112233</span></div>
              <div className="flex gap-2"><span className="font-semibold min-w-28">Đại diện:</span> <span>Ông/Bà {sellerName}</span></div>
              <div className="flex gap-2 items-center mt-2">
                <span className="font-semibold min-w-28">Ví điện tử:</span> 
                <span className="font-mono text-xs bg-slate-100 p-1.5 rounded border border-slate-300 text-slate-600">
                  {sellerSignature?.wallet 
                    ? `${sellerSignature.wallet.slice(0, 4)}...${sellerSignature.wallet.slice(-4)}` 
                    : 'Chưa kết nối'}
                </span>
              </div>
            </div>
          </div>

          {/* BÊN B */}
          <div className="space-y-3">
            <h4 className="font-bold text-lg uppercase border-l-4 border-slate-800 pl-3">Bên Mua (Bên B)</h4>
            <div className="space-y-2">
              <div className="flex gap-2"><span className="font-semibold min-w-28">Tên đơn vị:</span> <span>Công ty XNK Nông sản Agri-Export</span></div>
              <div className="flex gap-2"><span className="font-semibold min-w-28">Địa chỉ:</span> <span>Quận 1, Thành phố Hồ Chí Minh</span></div>
              <div className="flex gap-2"><span className="font-semibold min-w-28">Mã số thuế:</span> <span>0311223344</span></div>
              <div className="flex gap-2"><span className="font-semibold min-w-28">Đại diện:</span> <span>Ông/Bà {buyerName}</span></div>
              <div className="flex gap-2 items-center mt-2">
                <span className="font-semibold min-w-28">Ví điện tử:</span> 
                <span className="font-mono text-xs bg-slate-100 p-1.5 rounded border border-slate-300 text-slate-600">
                  {buyerSignature?.wallet 
                    ? `${buyerSignature.wallet.slice(0, 4)}...${buyerSignature.wallet.slice(-4)}` 
                    : 'Chưa kết nối'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-base font-bold mb-4 pt-2">Sau khi bàn bạc, hai bên thống nhất ký kết Hợp đồng mua bán với các điều khoản như sau:</p>

        {/* ĐIỀU 1: HÀNG HÓA VÀ TRỊ GIÁ */}
        <div className="mb-8 text-base">
          <h4 className="font-bold text-lg mb-4">Điều 1: Thông tin hàng hóa và Giá trị hợp đồng</h4>
          <div className="border border-slate-400 rounded overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-300">
                <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                  <th className="py-4 px-5 font-semibold w-2/5 border-r border-slate-300">Tên nông sản</th>
                  <td className="py-4 px-5">
                    <input
                      type="text"
                      value={terms.san_pham ?? ''}
                      onChange={(e) => handleInputChange('san_pham', e.target.value)}
                      disabled={isLocked}
                      className={`w-full bg-transparent border-b border-dashed border-slate-400 hover:border-slate-800 focus:border-slate-900 outline-none font-medium text-slate-900 ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                    />
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <th className="py-4 px-5 font-semibold border-r border-slate-300">Số lượng & Đơn vị</th>
                  <td className="py-4 px-5 flex gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        value={terms.so_luong ?? ''}
                        onChange={(e) => handleInputChange('so_luong', parseFloat(e.target.value) || 0)}
                        disabled={isLocked}
                        className={`w-full bg-transparent border-b border-dashed border-slate-400 hover:border-slate-800 focus:border-slate-900 outline-none font-medium text-slate-900 text-right ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-28">
                      <input
                        type="text"
                        value={terms.don_vi_tinh ?? ''}
                        onChange={(e) => handleInputChange('don_vi_tinh', e.target.value)}
                        disabled={isLocked}
                        className={`w-full bg-transparent border-b border-dashed border-slate-400 hover:border-slate-800 focus:border-slate-900 outline-none font-medium text-slate-900 text-center ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                      />
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                  <th className="py-4 px-5 font-semibold border-r border-slate-300">Đơn giá (VNĐ)</th>
                  <td className="py-4 px-5">
                    <input
                      type="number"
                      value={terms.don_gia ?? ''}
                      onChange={(e) => handleInputChange('don_gia', parseFloat(e.target.value) || 0)}
                      disabled={isLocked}
                      className={`w-full bg-transparent border-b border-dashed border-slate-400 hover:border-slate-800 focus:border-slate-900 outline-none font-medium text-slate-900 ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                    />
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <th className="py-4 px-5 font-semibold border-r border-slate-300">Tổng giá trị hợp đồng (VNĐ)</th>
                  <td className="py-4 px-5 font-black text-lg">
                    {totalVnd.toLocaleString('vi-VN')} <span className="font-normal text-base ml-1">VNĐ</span>
                  </td>
                </tr>
                <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                  <th className="py-4 px-5 font-semibold border-r border-slate-300">Quy đổi ký quỹ Escrow (SOL)</th>
                  <td className="py-4 px-5 font-bold text-emerald-700">
                    {totalSol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} <span className="font-normal ml-1">SOL</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <th className="py-4 px-5 font-semibold border-r border-slate-300">Hạn giao hàng muộn nhất</th>
                  <td className="py-4 px-5">
                    <input
                      type="datetime-local"
                      value={terms.han_giao_hang ? terms.han_giao_hang.slice(0, 16) : ''}
                      onChange={(e) => handleInputChange('han_giao_hang', e.target.value ? new Date(e.target.value).toISOString() : null)}
                      disabled={isLocked}
                      className={`w-full bg-transparent border-b border-dashed border-slate-400 hover:border-slate-800 focus:border-slate-900 outline-none font-medium text-slate-900 ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ĐIỀU 2: TIÊU CHUẨN KỸ THUẬT & PHẠT CHẤT LƯỢNG */}
        <div className="mb-10 text-base">
          <h4 className="font-bold text-lg mb-4">Điều 2: Tiêu chuẩn kỹ thuật và Phạt vi phạm</h4>
          <p className="mb-4 text-slate-800 text-justify leading-relaxed">
            Bên Bán cam kết giao hàng đúng tiêu chuẩn kỹ thuật quy định. Trường hợp chất lượng thực tế khi kiểm định vượt ngưỡng tối đa cho phép, Bên Bán đồng ý áp dụng mức phạt khấu trừ trực tiếp vào tổng giá trị thanh toán như sau:
          </p>
          <div className="border border-slate-400 rounded overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-400">
                <tr>
                  <th className="py-3 px-5 font-semibold w-1/2 border-r border-slate-300">Tiêu chí kiểm định</th>
                  <th className="py-3 px-5 font-semibold w-1/5 border-r border-slate-300 text-center">Ngưỡng tối đa</th>
                  <th className="py-3 px-5 font-semibold border-r border-slate-300 text-center">Hình thức xử lý / Mức phạt</th>
                  {!isLocked && <th className="py-3 px-3 font-semibold text-center w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {(terms.dieu_khoan_chat_luong || []).map((rule, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 border-r border-slate-300">
                      <input
                        type="text"
                        value={rule.tieu_chi ?? ''}
                        onChange={(e) => handleQualityRuleChange(idx, 'tieu_chi', e.target.value)}
                        disabled={isLocked}
                        className={`w-full bg-transparent border-b border-dashed border-slate-400 hover:border-slate-850 focus:border-slate-900 outline-none font-medium text-slate-900 ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                      />
                    </td>
                    <td className="py-3 px-5 border-r border-slate-300 text-center">
                      <div className="flex justify-center items-center gap-1">
                        <input
                          type="number"
                          value={rule.nguong_phan_tram ?? ''}
                          onChange={(e) => handleQualityRuleChange(idx, 'nguong_phan_tram', parseFloat(e.target.value) || 0)}
                          disabled={isLocked}
                          className={`w-16 bg-transparent border-b border-dashed border-slate-400 hover:border-slate-850 focus:border-slate-900 outline-none font-medium text-slate-900 text-center ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                        />
                        <span className="font-medium">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 border-r border-slate-300 text-center">
                      <div className="flex justify-center items-center gap-1 text-red-700 font-bold w-full">
                        <textarea
                          value={rule.muc_phat || ''}
                          onChange={(e) => handleQualityRuleChange(idx, 'muc_phat', e.target.value)}
                          disabled={isLocked}
                          className={`w-full bg-transparent border-b border-dashed border-slate-400 hover:border-red-600 focus:border-red-600 outline-none text-center resize-none overflow-hidden py-1 leading-tight ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                          placeholder="Ví dụ: Từ chối nhận hàng"
                          rows={Math.max(1, Math.ceil((rule.muc_phat?.length || 0) / 22))}
                        />
                      </div>
                    </td>
                    {!isLocked && (
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveQualityRule(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title="Xóa tiêu chí"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLocked && (
            <div className="mt-4 flex justify-start">
              <button
                type="button"
                onClick={handleAddQualityRule}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-dashed border-slate-400 rounded transition-all shadow-sm bg-white"
              >
                <Plus size={14} className="text-slate-500" />
                Thêm tiêu chí kiểm định (Điều 2)
              </button>
            </div>
          )}
        </div>

        {/* ĐIỀU 3: CHỮ KÝ VÀ BẢO CHỨNG SỐ */}
        <div className="mb-6 text-base">
          <h4 className="font-bold text-lg mb-4">Điều 3: Cam kết và Ký số</h4>
          <p className="mb-8 text-slate-800 text-justify leading-relaxed">
            Hai bên đã đọc, hiểu rõ và đồng ý với mọi điều khoản. Hợp đồng này có hiệu lực pháp lý và được bảo chứng thông qua Smart Contract trên nền tảng Blockchain Solana.
          </p>

          <div className="grid grid-cols-2 gap-8 text-center pt-6 pb-12">
            {/* CHỮ KÝ BÊN A (BÊN BÁN) */}
            <div className="space-y-4 flex flex-col items-center">
              <h5 className="font-bold text-base uppercase mb-2">Đại diện Bên A (Bên Bán)</h5>
              {sellerSignature ? (
                <div className="flex flex-col w-full border border-emerald-500 bg-emerald-50 rounded-lg p-4 shadow-sm relative overflow-hidden text-left">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1 rounded-bl-lg">
                    <CheckCircle2 size={12} /> ON-CHAIN VERIFIED
                  </div>
                  <p className="font-bold text-emerald-900 text-lg mb-3 pt-1">{sellerSignature.name}</p>
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-2 text-xs">
                    <span className="text-emerald-700/70 font-semibold flex items-center gap-1"><Link2 size={12}/> Wallet:</span>
                    <span className="font-mono text-emerald-800 break-all">{sellerSignature.wallet}</span>
                    <span className="text-emerald-700/70 font-semibold flex items-center gap-1"><Link2 size={12}/> Tx Hash:</span>
                    <span className="font-mono text-emerald-800 break-all">{sellerSignature.txHash}</span>
                    <span className="text-emerald-700/70 font-semibold flex items-center gap-1"><Link2 size={12}/> Time:</span>
                    <span className="text-emerald-800">{new Date(sellerSignature.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full px-4 gap-3 my-4">
                  <div className="w-24 h-24 border-4 border-dashed border-slate-300 rounded-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 mb-2">
                    <FileSignature size={24} className="mb-1 opacity-50" />
                    <span className="text-[10px] uppercase font-semibold">Chờ ký</span>
                  </div>
                  
                  {currentRole === 'nong_dan' && onSignSeller && !isLocked && (
                    <div className="w-full max-w-[220px] flex flex-col gap-2">
                      {partnerCount === 0 && !isDemoCall ? (
                        <p className="text-xs text-red-500 font-semibold italic text-center leading-normal">
                          ⚠️ Chờ đối tác tham gia cuộc họp để ký hợp đồng
                        </p>
                      ) : (
                        <>
                          <input 
                            type="text" 
                            placeholder="Nhập họ tên của bạn..." 
                            value={typedSellerName}
                            onChange={(e) => setTypedSellerName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:border-emerald-500 outline-none text-center bg-white shadow-inner"
                          />
                          <button 
                            disabled={!typedSellerName.trim() || isSigningSeller}
                            onClick={() => onSignSeller(typedSellerName)}
                            className="w-full bg-[#ab9ff2] hover:bg-[#9789eb] text-white py-2 rounded-lg text-sm font-bold shadow disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {isSigningSeller ? <span className="animate-pulse">Đang ký...</span> : 'Ký bằng Phantom'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {currentRole !== 'nong_dan' && (
                    <p className="text-sm text-slate-500 italic mt-2">Chờ đối tác ký xác nhận</p>
                  )}
                </div>
              )}
            </div>

            {/* CHỮ KÝ BÊN B (BÊN MUA) */}
            <div className="space-y-4 flex flex-col items-center">
              <h5 className="font-bold text-base uppercase mb-2">Đại diện Bên B (Bên Mua)</h5>
              {buyerSignature ? (
                <div className="flex flex-col w-full border border-indigo-500 bg-indigo-50 rounded-lg p-4 shadow-sm relative overflow-hidden text-left">
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1 rounded-bl-lg">
                    <CheckCircle2 size={12} /> ON-CHAIN VERIFIED
                  </div>
                  <p className="font-bold text-indigo-900 text-lg mb-3 pt-1">{buyerSignature.name}</p>
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-2 text-xs">
                    <span className="text-indigo-700/70 font-semibold flex items-center gap-1"><Link2 size={12}/> Wallet:</span>
                    <span className="font-mono text-indigo-800 break-all">{buyerSignature.wallet}</span>
                    <span className="text-indigo-700/70 font-semibold flex items-center gap-1"><Link2 size={12}/> Tx Hash:</span>
                    <span className="font-mono text-indigo-800 break-all">{buyerSignature.txHash}</span>
                    <span className="text-indigo-700/70 font-semibold flex items-center gap-1"><Link2 size={12}/> Time:</span>
                    <span className="text-indigo-800">{new Date(buyerSignature.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full px-4 gap-3 my-4">
                  <div className="w-24 h-24 border-4 border-dashed border-slate-300 rounded-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 mb-2">
                    <FileSignature size={24} className="mb-1 opacity-50" />
                    <span className="text-[10px] uppercase font-semibold">Chờ ký</span>
                  </div>
                  
                  {currentRole === 'thuong_lai' && onSignBuyer && !isLocked && (
                    <div className="w-full max-w-[220px] flex flex-col gap-2">
                      {partnerCount === 0 && !isDemoCall ? (
                        <p className="text-xs text-red-500 font-semibold italic text-center leading-normal">
                          ⚠️ Chờ đối tác tham gia cuộc họp để ký hợp đồng
                        </p>
                      ) : (
                        <>
                          <input 
                            type="text" 
                            placeholder="Nhập họ tên của bạn..." 
                            value={typedBuyerName}
                            onChange={(e) => setTypedBuyerName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:border-indigo-500 outline-none text-center bg-white shadow-inner"
                          />
                          <button 
                            disabled={!typedBuyerName.trim() || isSigningBuyer}
                            onClick={() => onSignBuyer(typedBuyerName)}
                            className="w-full bg-[#ab9ff2] hover:bg-[#9789eb] text-white py-2 rounded-lg text-sm font-bold shadow disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {isSigningBuyer ? <span className="animate-pulse">Đang ký...</span> : 'Ký bằng Phantom'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {currentRole !== 'thuong_lai' && (
                    <p className="text-sm text-slate-500 italic mt-2">Chờ đối tác ký xác nhận</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
