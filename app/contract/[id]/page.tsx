'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getContractById } from '../../../lib/supabase/queries/contracts';
import { getDisputeByContractId } from '../../../lib/supabase/queries/disputes';
import { useEscrow } from '../../../hooks/useEscrow';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase/client';

import ConfirmReceiptButton from '../../../components/dispute/ConfirmReceiptButton';
import DisputeReportForm from '../../../components/dispute/DisputeReportForm';
import ApproveReportButtons from '../../../components/dispute/ApproveReportButtons';
import SettlementProposal from '../../../components/dispute/SettlementProposal';
import AgreeButtons from '../../../components/dispute/AgreeButtons';
import TimeoutClaimButton from '../../../components/dispute/TimeoutClaimButton';
import DraftContractTable from '../../../components/negotiation/DraftContractTable';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Package,
  HelpCircle,
  Camera,
  Layers,
  Loader2
} from 'lucide-react';

function ContractPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const contractId = params.id as string;
  const scenario = searchParams.get('scenario') || 'A';
  const initialTx = searchParams.get('tx') || '';

  const [contract, setContract] = useState<any>(null);
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [txSignature, setTxSignature] = useState(initialTx);
  const [successMsg, setSuccessMsg] = useState('');
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'paper' | 'overview'>('paper');
  const [copied, setCopied] = useState(false);

  // Trạng thái hiển thị form khiếu nại (Nghiệm thu đạt chuẩn hay Phát hiện sự cố)
  const [inspectionDecision, setInspectionDecision] = useState<'undecided' | 'ok' | 'issue'>('undecided');
  const [isBypassDeadline, setIsBypassDeadline] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'confirm') {
      setInspectionDecision('ok');
    } else if (action === 'dispute') {
      setInspectionDecision('issue');
    }
  }, [searchParams]);

  const { confirmReceipt, loading: escrowLoading } = useEscrow();

  // Tải thông tin hợp đồng và tranh chấp từ Supabase (kèm Mock Fallback nếu không có trong DB)
  const loadData = async () => {
    try {
      setLoading(true);
      if (contractId === 'a1b2c3d4-e5f6-7890-abcd-100000000001') {
        setContract({
          id: 'a1b2c3d4-e5f6-7890-abcd-100000000001',
          vi_nguoi_ban: 'nong_dan_wallet_address_demo',
          vi_nguoi_mua: 'thuong_lai_wallet_address_demo',
          san_pham: 'Cà phê Robusta',
          so_luong: 2,
          don_vi_tinh: 'tấn',
          don_gia: 75000000,
          han_giao_hang: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          dieu_khoan_chat_luong: [{ tieu_chi: 'Hạt đen vỡ', nguong_phan_tram: 5, muc_phat: 'Trừ 1% giá trị' }],
          ty_gia_vnd_usdc: 4000000,
          tong_tien_usdc_khoa: 37.5,
          dia_chi_vi_escrow: 'Solana_Escrow_PDA_Demo',
          trang_thai: 'da_khoa_tien',
          ngay_tao: new Date().toISOString(),
          ngay_xac_nhan: new Date().toISOString(),
          noi_dung_nhap_ai: {
            san_pham: 'Cà phê Robusta',
            so_luong: 2,
            don_gia: 75000000,
            nguon: 'Trích xuất từ đàm phán thoại AI'
          }
        });
        setDispute(null);
        setLoading(false);
        return;
      }

      const con = await getContractById(contractId);
      if (con) {
        // Tải thêm thông tin tên hiển thị từ ví người bán và người mua
        const { data: sellerData } = await supabase
          .from('nguoi_dung')
          .select('ten_hien_thi')
          .eq('dia_chi_vi', con.vi_nguoi_ban)
          .maybeSingle();

        const { data: buyerData } = await supabase
          .from('nguoi_dung')
          .select('ten_hien_thi')
          .eq('dia_chi_vi', con.vi_nguoi_mua)
          .maybeSingle();

        con.seller_name = sellerData?.ten_hien_thi || 'Nông dân';
        con.buyer_name = buyerData?.ten_hien_thi || 'Thương lái';
      }
      setContract(con);

      const disp = await getDisputeByContractId(contractId);
      setDispute(disp);

      try {
        const { getTranscriptsByContractId } = await import('../../../lib/supabase/queries/transcripts');
        const txs = await getTranscriptsByContractId(contractId);
        setTranscripts(txs || []);
      } catch (err) {
        console.warn('Lỗi tải lịch sử đàm phán:', err);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu hợp đồng:', err);
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!contractId) return;

    loadData();

    // Thiết lập realtime subscription để tự động cập nhật UI khi có thay đổi từ bên kia
    const contractChannel = supabase
      .channel(`contract_changes_${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bao_cao_tranh_chap',
          filter: `id_hop_dong=eq.${contractId}`,
        },
        (payload) => {
          console.log('Realtime: phát hiện thay đổi báo cáo tranh chấp:', payload);
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hop_dong',
          filter: `id=eq.${contractId}`,
        },
        (payload) => {
          console.log('Realtime: phát hiện thay đổi hợp đồng:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contractChannel);
    };
  }, [contractId]);

  // Xử lý kịch bản A: Giải ngân 100% khi người mua bấm nhận hàng đủ
  const handleConfirmReceipt = async () => {
    try {
      const result = await confirmReceipt(
        contract.id,
        contract.vi_nguoi_mua,
        contract.vi_nguoi_ban
      );
      if (result.success) {
        setTxSignature(result.txSignature);
        setSuccessMsg('✓ Giải ngân 100% thành công! Tiền từ Escrow PDA đã được chuyển vào ví Nông dân.');
        setContract((prev: any) => ({ ...prev, trang_thai: 'da_xac_nhan' }));
      }
    } catch (err) {
      console.error(err);
      setSuccessMsg('✓ Giải ngân thành công! (Chế độ giả lập)');
      setContract((prev: any) => ({ ...prev, trang_thai: 'da_xac_nhan' }));
    }
  };

  const handleTxSuccess = (sig: string) => {
    setTxSignature(sig);
    setSuccessMsg('✓ Giao dịch thực thi on-chain thành công!');
    loadData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white text-neutral-400 min-h-screen gap-2">
        <Loader2 size={18} className="animate-spin text-[#15803D]" />
        <span className="text-sm font-semibold">Đang truy xuất thông tin tài khoản ký quỹ...</span>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-[#FAFAF9] text-neutral-500 gap-4 min-h-screen">
        <AlertCircle size={36} className="text-red-500" />
        <p className="font-bold text-sm">Không tìm thấy mã hợp đồng tương ứng.</p>
        <Link href="/" className="btn-secondary text-xs">➔ Quay lại Trang chủ</Link>
      </div>
    );
  }

  const isNongDan = user?.vai_tro === 'nong_dan';

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FBFBFA]">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-250 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
            <ArrowLeft size={14} className="text-slate-650" /> Trở lại Trang chủ
          </Link>
          
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
            <span>Chi tiết hợp đồng:</span>
            <div className="flex items-center gap-1.5 relative">
              <span className="font-mono text-neutral-900 bg-neutral-100 px-2 py-1 rounded select-all" title={contract.id}>
                {contract.id.slice(0, 8)}...
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contract.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center border border-slate-200/50 shadow-sm"
                title="Sao chép mã hợp đồng"
              >
                📋
              </button>
              {copied && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-900/95 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap shadow-md z-50 border border-white/10">
                  Đã sao chép!
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* CỘT TRÁI: THÔNG TIN HỒ SƠ HỢP ĐỒNG GỐC */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">

            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 print:hidden gap-4">
              <div>
                <h3 className="font-extrabold text-neutral-900 text-[15px] flex items-center gap-2">
                  <FileText size={17} className="text-[#15803D]" /> Hồ sơ Hợp đồng Ký quỹ
                </h3>
                <p className="text-[11px] text-neutral-450 mt-0.5">Văn bản mô phỏng hợp đồng có chữ ký số Blockchain</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setViewMode('paper')}
                    className={`px-4 py-2 text-xs font-bold transition-all relative cursor-pointer ${viewMode === 'paper' ? 'text-[#2e7d32]' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <span>Chế độ Văn bản</span>
                    {viewMode === 'paper' && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2e7d32] rounded-full" />}
                  </button>
                  <button
                    onClick={() => setViewMode('overview')}
                    className={`px-4 py-2 text-xs font-bold transition-all relative cursor-pointer ${viewMode === 'overview' ? 'text-[#2e7d32]' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <span>Chế độ Tổng quan</span>
                    {viewMode === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2e7d32] rounded-full" />}
                  </button>
                </div>
                {viewMode === 'paper' && (
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 transition-colors shadow-sm cursor-pointer animate-fadeIn"
                  >
                    In / Lưu PDF
                  </button>
                )}
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm shrink-0 whitespace-nowrap ${contract.trang_thai === 'da_khoa_tien' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                    contract.trang_thai === 'da_xac_nhan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      contract.trang_thai === 'da_giai_quyet' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                  {contract.trang_thai === 'da_khoa_tien' ? 'Đã ký quỹ (Locked)' :
                    contract.trang_thai === 'da_xac_nhan' ? '✅ Đã giải ngân 100%' :
                      contract.trang_thai === 'da_giai_quyet' ? '⚖️ Đã phân xử' : contract.trang_thai}
                </span>
              </div>
            </div>

            {/* Render conditional UI based on viewMode */}
            {viewMode === 'paper' ? (
              <div className="print:m-0 print:max-h-none print:overflow-visible max-h-[75vh] overflow-y-auto">
                <DraftContractTable
                  terms={contract}
                  onChange={() => { }} // Disabled
                  isLocked={true}
                  buyerName={contract.buyer_name}
                  sellerName={contract.seller_name}
                  buyerSignature={contract.noi_dung_nhap_ai?.buyerSignature || {
                    name: contract.buyer_name,
                    wallet: contract.vi_nguoi_mua,
                    timestamp: contract.ngay_tao,
                    txHash: ''
                  }}
                  sellerSignature={contract.noi_dung_nhap_ai?.sellerSignature || {
                    name: contract.seller_name,
                    wallet: contract.vi_nguoi_ban,
                    timestamp: contract.ngay_tao,
                    txHash: ''
                  }}
                  currentRole={isNongDan ? 'nong_dan' : 'thuong_lai'}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2.5 bg-neutral-50 p-4 rounded-xl border border-neutral-150 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">NÔNG SẢN</span>
                    <span className="text-xs font-extrabold text-neutral-800">{contract.san_pham}</span>
                  </div>
                  <div className="border-x border-neutral-200">
                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">SỐ LƯỢNG GỐC</span>
                    <span className="text-xs font-extrabold text-neutral-800">{contract.so_luong} {contract.don_vi_tinh}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">ĐƠN GIÁ CHỐT</span>
                    <span className="text-xs font-extrabold text-neutral-800">{(contract.don_gia).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between border-b border-neutral-100 pb-2">
                    <span className="text-neutral-450">Địa chỉ Escrow (PDA):</span>
                    <span className="font-mono text-neutral-800 text-[11px] font-semibold">{contract.dia_chi_vi_escrow || 'MOCK_ESCROW_PDA_VAULT'}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 pb-2">
                    <span className="text-neutral-450">Tổng số tiền ký quỹ:</span>
                    <span className="font-bold text-[#15803D]">
                      {contract.tong_tien_usdc_khoa
                        ? (contract.tong_tien_usdc_khoa * 4000000).toLocaleString('vi-VN')
                        : (contract.don_gia * contract.so_luong).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 pb-2">
                    <span className="text-neutral-450">Tương đương token:</span>
                    <span className="font-bold text-[#15803D] font-mono">{contract.tong_tien_usdc_khoa || Math.round((contract.don_gia * contract.so_luong) / 4000000)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-450">Hạn giao nhận cam kết:</span>
                    <span className="font-bold text-neutral-800">{new Date(contract.han_giao_hang).toLocaleString('vi-VN')}</span>
                  </div>

                  <div className="border-t border-neutral-100 pt-3.5 mt-3.5 space-y-2.5">
                    <p className="font-bold text-neutral-800 text-[11px] uppercase tracking-wider">Chữ ký số các bên</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-150 text-[11px] space-y-1">
                        <span className="text-neutral-400 font-semibold block">Đại diện Bên A (Bên bán):</span>
                        <span className="font-bold text-neutral-800 block text-xs">
                          {contract.noi_dung_nhap_ai?.sellerSignature?.name || contract.seller_name || 'Chưa cập nhật tên'}
                        </span>
                        <span className="font-mono text-[9px] text-neutral-500 break-all block">
                          {contract.noi_dung_nhap_ai?.sellerSignature?.wallet
                            ? `${contract.noi_dung_nhap_ai.sellerSignature.wallet.slice(0, 6)}...${contract.noi_dung_nhap_ai.sellerSignature.wallet.slice(-4)}`
                            : (contract.vi_nguoi_ban ? `${contract.vi_nguoi_ban.slice(0, 6)}...${contract.vi_nguoi_ban.slice(-4)}` : 'Chưa có ví')}
                        </span>
                      </div>
                      <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-150 text-[11px] space-y-1">
                        <span className="text-neutral-400 font-semibold block">Đại diện Bên B (Bên mua):</span>
                        <span className="font-bold text-neutral-800 block text-xs">
                          {contract.noi_dung_nhap_ai?.buyerSignature?.name || contract.buyer_name || 'Chưa cập nhật tên'}
                        </span>
                        <span className="font-mono text-[9px] text-neutral-500 break-all block">
                          {contract.noi_dung_nhap_ai?.buyerSignature?.wallet
                            ? `${contract.noi_dung_nhap_ai.buyerSignature.wallet.slice(0, 6)}...${contract.noi_dung_nhap_ai.buyerSignature.wallet.slice(-4)}`
                            : (contract.vi_nguoi_mua ? `${contract.vi_nguoi_mua.slice(0, 6)}...${contract.vi_nguoi_mua.slice(-4)}` : 'Chưa có ví')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs giao dịch */}
            <div className="print:hidden space-y-3">
              {txSignature && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl text-xs space-y-1.5">
                  <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Chữ ký Giao dịch Solana (Devnet):
                  </p>
                  <a
                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-neutral-600 break-all hover:underline hover:text-indigo-600 block"
                  >
                    {txSignature}
                  </a>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 text-[#15803D] rounded-xl text-xs font-bold text-center">
                  {successMsg}
                </div>
              )}
            </div>
          </div>

          {/* Kịch bản C - Giải ngân do quá hạn (Chỉ dành cho Nông dân gọi) */}
          {scenario === 'C' && contract.trang_thai === 'da_khoa_tien' && isNongDan && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Kịch bản C: Rút tiền quá hạn (Timeout)</h4>
              <p className="text-xs text-neutral-500">Người mua im lặng và quá hạn cam kết giao nhận. Bạn có quyền đòi lại tiền cọc.</p>
              <TimeoutClaimButton
                contractId={contract.id}
                buyerAddress={contract.vi_nguoi_mua}
                sellerAddress={contract.vi_nguoi_ban}
                deadlineIso={contract.han_giao_hang}
                onSuccess={handleTxSuccess}
              />
            </div>
          )}
          {/* LỊCH SỬ ĐÀM PHÁN (STT) */}
          {transcripts.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-neutral-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Lịch sử Đàm Phán</h3>
                  
                  <div className="group relative flex items-center">
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-250/60 px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-help shadow-sm">
                      <span>✨</span> AI XÁC THỰC
                    </span>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 hidden group-hover:block bg-slate-900/95 backdrop-blur-sm text-white text-[11px] rounded-lg p-2.5 shadow-xl z-50 text-center border border-white/10 transition-all leading-normal font-semibold">
                      Lịch sử đàm phán được AI xác thực và lưu trên blockchain
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 max-h-[400px]">
                {transcripts.map((msg, idx) => {
                  const isSenderNongDan = msg.vi_nguoi_noi === contract.vi_nguoi_ban;
                  const senderName = isSenderNongDan ? contract.seller_name : contract.buyer_name;
                  const senderRole = isSenderNongDan ? 'Nông dân' : 'Thương lái';
                  const displayName = senderName || senderRole;
                  
                  const getFormattedTime = (dateStr?: string) => {
                    if (!dateStr) return '';
                    try {
                      const d = new Date(dateStr);
                      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    } catch (e) {
                      return '';
                    }
                  };
                  
                  return (
                    <div key={idx} className={`flex flex-col ${isSenderNongDan ? 'items-start' : 'items-end'}`}>
                      <span className="text-[10px] font-bold text-neutral-450 mb-1 px-1 uppercase tracking-wider">
                        {displayName}
                      </span>
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[13px] leading-relaxed shadow-sm ${
                        isSenderNongDan
                          ? 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
                          : 'bg-emerald-50 text-emerald-800 rounded-tr-none border border-emerald-250/60'
                      }`}>
                        {msg.noi_dung}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 block px-1">
                        {getFormattedTime(msg.ngay_tao || msg.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* CỘT PHẢI: QUY TRÌNH NGHIỆM THU, GIAO NHẬN VÀ KHIẾU NẠI */}
        <div className="lg:col-span-4 space-y-6 print:hidden">

          {contract.trang_thai === 'da_khoa_tien' && !dispute && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">

              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                <Package size={17} className="text-[#15803D]" />
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Quy trình Nghiệm thu & Giao nhận</h3>
              </div>

              {/* Giao diện dành cho người mua (Thương lái) tiến hành nghiệm thu */}
              {!isNongDan ? (
                <div className="space-y-5">
                  {inspectionDecision === 'undecided' && (
                    <div className="space-y-4">
                      {contract?.han_giao_hang && new Date() < new Date(contract.han_giao_hang) && !isBypassDeadline ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col items-center justify-center text-center animate-fadeIn">
                          <AlertCircle size={28} className="text-amber-500 mb-2" />
                          <h4 className="text-sm font-bold text-amber-800 mb-1">Chưa tới hạn giao hàng</h4>
                          <p className="text-xs text-amber-700 max-w-md">
                            Hợp đồng này có hạn giao hàng là <strong>{new Date(contract.han_giao_hang).toLocaleDateString('vi-VN')}</strong>. 
                            Vui lòng chờ đến ngày giao nhận thực tế để tiến hành nghiệm thu.
                          </p>
                          <button onClick={() => setIsBypassDeadline(true)} className="mt-3 text-[10px] text-amber-600/60 hover:text-amber-600 underline transition-colors cursor-pointer border-none bg-transparent">
                            [Demo Bypass] Bỏ qua kiểm tra thời gian để test ngay
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-neutral-500 leading-relaxed">
                            Lô hàng nông sản đã được chuyển tới điểm giao nhận. Bạn đã kiểm nghiệm thực tế chưa? Vui lòng chọn tình trạng nghiệm thu bên dưới:
                          </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Option 1: Hàng đạt chuẩn */}
                        <button
                          onClick={() => setInspectionDecision('ok')}
                          className="flex flex-col items-center justify-center p-5 rounded-xl border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-center transition-all cursor-pointer group active:scale-98"
                        >
                          <CheckCircle2 size={24} className="text-neutral-400 group-hover:text-emerald-600 transition-colors mb-2" />
                          <span className="font-bold text-xs text-neutral-850 block">Nghiệm thu đạt chuẩn</span>
                          <span className="text-[10px] text-neutral-450 mt-1 block">Không có sai lệch, giải ngân 100%</span>
                        </button>

                        {/* Option 2: Phát hiện sự cố */}
                        <button
                          onClick={() => setInspectionDecision('issue')}
                          className="flex flex-col items-center justify-center p-5 rounded-xl border border-neutral-200 hover:border-red-500 hover:bg-red-50/20 text-center transition-all cursor-pointer group active:scale-98"
                        >
                          <AlertCircle size={24} className="text-neutral-400 group-hover:text-red-600 transition-colors mb-2" />
                          <span className="font-bold text-xs text-neutral-850 block">Phát hiện lỗi nông sản</span>
                          <span className="text-[10px] text-neutral-450 mt-1 block">Có hao hụt số lượng / lỗi chất lượng</span>
                        </button>
                      </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Lựa chọn 1: Nghiệm thu đạt chuẩn - kích hoạt xác nhận nhận hàng */}
                  {inspectionDecision === 'ok' && (
                    <div className="space-y-4 text-center py-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={32} className="text-[#15803D] mx-auto animate-bounce" />
                      <div>
                        <h4 className="font-bold text-neutral-800 text-xs uppercase">Xác nhận Giải ngân 100%</h4>
                        <p className="text-[11px] text-neutral-400 max-w-xs mx-auto mt-1">
                          Hệ thống sẽ chuyển toàn bộ SOL đang khóa trong két sắt Solana sang ví của Nông dân.
                        </p>
                      </div>
                      <div className="flex justify-center gap-2">
                        <ConfirmReceiptButton
                          contractId={contract.id}
                          buyerAddress={contract.vi_nguoi_mua}
                          sellerAddress={contract.vi_nguoi_ban}
                          onSuccess={handleTxSuccess}
                        />
                        <button
                          onClick={() => setInspectionDecision('undecided')}
                          className="btn-secondary text-xs border-neutral-250 py-2"
                        >
                          Quay lại
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lựa chọn 2: Phát hiện lỗi - hiển thị form khiếu nại */}
                  {inspectionDecision === 'issue' && !dispute && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: 'rgba(211,47,47,0.08)', borderColor: '#d32f2f' }}>
                        <span className="text-[11px] text-[#d32f2f] font-extrabold flex items-center gap-1.5">
                          <span className="text-sm" aria-label="cảnh báo">⚠️</span> Đang kích hoạt luồng Khiếu nại (Kịch bản B)
                        </span>
                        <button
                          onClick={() => setInspectionDecision('undecided')}
                          className="text-[10px] px-2 py-1 font-bold border border-[#d32f2f] rounded text-[#d32f2f] hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                      </div>
                      <DisputeReportForm contract={contract} onSubmitted={loadData} />
                    </div>
                  )}
                </div>
              ) : (
                // Giao diện dành cho người bán (Nông dân) khi hàng chưa nghiệm thu xong
                <div className="p-6 text-center border border-dashed border-neutral-200 rounded-xl text-neutral-400 space-y-2">
                  <Clock size={28} className="mx-auto text-neutral-350 animate-spin" />
                  <p className="text-xs font-bold">Đang đợi Thương lái nghiệm thu...</p>
                  <p className="text-[10px] text-neutral-450">Thương lái sẽ kiểm định chất lượng, xác nhận giải ngân 100% hoặc gửi báo cáo chất lượng nếu có sai lệch.</p>
                </div>
              )}
            </div>
          )}

          {/* QUY TRÌNH XỬ LÝ TRANH CHẤP KHI ĐÃ CÓ BÁO CÁO (KỊCH BẢN B) */}
          {dispute && (
            <div className="space-y-6">

              {/* Chi tiết đơn khiếu nại nghiệm thu */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <span className="text-xs font-bold text-red-650 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={14} /> Chi tiết lỗi nghiệm thu
                  </span>
                  <span className="text-[10px] font-mono flex items-center">
                    {dispute.trang_thai === 'da_giai_ngan' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold animate-pulse">
                        ✅ Đã Giải Ngân
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px]">
                        Trạng thái: {dispute.trang_thai}
                      </span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-150">
                    <span className="text-[10px] text-neutral-400 block font-bold mb-0.5">SỐ LƯỢNG THỰC NHẬN</span>
                    <span className="font-extrabold text-neutral-800">{dispute.so_luong_thuc_nhan} {contract.don_vi_tinh}</span>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-150">
                    <span className="text-[10px] text-neutral-400 block font-bold mb-0.5">HAO HỤT SO VỚI DEAL</span>
                    <span className="font-extrabold text-[#d32f2f] text-sm">
                      -{Math.max(0, contract.so_luong - dispute.so_luong_thuc_nhan)} {contract.don_vi_tinh}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Ghi nhận lỗi từ thương lái:</span>
                  <p className="bg-red-50/20 p-3 rounded-lg border border-red-100 text-neutral-600 leading-relaxed">
                    {dispute.ghi_chu_chat_luong || 'Chưa có mô tả bổ sung.'}
                  </p>
                </div>

                {dispute.danh_sach_url_anh && dispute.danh_sach_url_anh.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Ảnh bằng chứng hiện trường:</span>
                    <div className="flex gap-2">
                      {dispute.danh_sach_url_anh.map((url: string, index: number) => (
                        <div key={index} className="w-16 h-16 rounded-lg border border-neutral-250 overflow-hidden">
                          <img src={url} alt="Evidence defect" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Nông dân xác nhận đồng ý với báo cáo nghiệm thu này để AI tính toán tiếp */}
              {isNongDan && (
                <ApproveReportButtons
                  disputeId={dispute.id}
                  isApproved={dispute.nguoi_ban_da_duyet}
                  onUpdate={loadData}
                />
              )}

              {/* AI Đề xuất phân phối cọc */}
              {dispute.ty_le_giai_ngan_ai_de_xuat !== null && (
                <SettlementProposal
                  proposedRatio={dispute.ty_le_giai_ngan_ai_de_xuat}
                  payoutAmount={dispute.so_tien_giai_ngan_de_xuat}
                  refundAmount={dispute.so_tien_hoan_lai_de_xuat}
                  note={dispute.ghi_chu_chat_luong || 'AI đã tính toán dựa trên độ ẩm, hạt lép và sản lượng hao hụt thực tế.'}
                />
              )}

              {/* Nút bấm đồng thuận 2 bên để kích hoạt on-chain resolve_partial */}
              {contract.trang_thai === 'dang_tranh_chap' && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="text-center pb-2 border-b border-neutral-100">
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Đồng thuận quyết định giải quyết</h4>
                    <p className="text-[10px] text-neutral-400 mt-1">Cả nông dân và thương lái cần xác nhận để thực thi lệnh chia tiền ví tự động.</p>
                  </div>

                  <AgreeButtons
                    contractId={contract.id}
                    disputeId={dispute.id}
                    buyerAddress={contract.vi_nguoi_mua}
                    sellerAddress={contract.vi_nguoi_ban}
                    buyerAgreed={dispute.nguoi_mua_dong_y}
                    sellerAgreed={dispute.nguoi_ban_dong_y}
                    actualQty={dispute.so_luong_thuc_nhan}
                    onSuccess={handleTxSuccess}
                  />
                </div>
              )}

            </div>
          )}

          {/* TRẠNG THÁI CUỐI - ĐÃ GIẢI QUYẾT XONG */}
          {contract.trang_thai !== 'da_khoa_tien' && contract.trang_thai !== 'dang_tranh_chap' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-extrabold text-neutral-800 text-[14px] uppercase tracking-wide">Tài khoản Ký quỹ đã thanh lý</h4>
                <p className="text-xs text-neutral-450 mt-1.5">
                  Mọi nghĩa vụ thanh toán của hợp đồng này đã kết thúc an toàn.
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 text-xs text-neutral-500 space-y-1">
                <p>
                  Trạng thái: {' '}
                  <span className="font-bold text-[#15803D]">
                    {contract.trang_thai === 'da_giai_quyet' ? 'Hợp đồng đã hoàn tất' : 
                     contract.trang_thai === 'da_xac_nhan' ? 'Hợp đồng đã hoàn tất (Giải ngân 100%)' : 
                     contract.trang_thai}
                  </span>
                </p>
                {(contract.trang_thai === 'da_giai_quyet' || contract.trang_thai === 'da_xac_nhan') && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Thời gian hoàn tất: <span className="font-semibold text-slate-600">
                      {(() => {
                        const dateStr = contract.ngay_xac_nhan || contract.ngay_tao;
                        if (!dateStr) return new Date().toLocaleString('vi-VN');
                        try {
                          return new Date(dateStr).toLocaleString('vi-VN');
                        } catch (e) {
                          return new Date().toLocaleString('vi-VN');
                        }
                      })()}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}

export default function ContractPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#15803D]" />
      </div>
    }>
      <ContractPageContent />
    </Suspense>
  );
}
