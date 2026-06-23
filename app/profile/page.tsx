'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import ConnectWalletButton from '../../components/shared/ConnectWalletButton';
import WalletBalance from '../../components/shared/WalletBalance';
import { useWallet } from '../../hooks/useWallet';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { UserCircle, MapPin, Calendar, ShieldCheck, Phone, Wallet, ChevronLeft, ChevronRight, Loader2, Award, LogOut, Edit3, Check, X, Package, Plus, Trash2, Briefcase, Camera, AlertCircle, Copy } from 'lucide-react';
import { getProfileStats } from '../../lib/supabase/queries/contactRequests';
import { getFarmerProductsByWallet, createFarmerProduct, deleteFarmerProduct } from '../../lib/supabase/queries/listings';
import { updateUserProfile } from '../../lib/supabase/queries/auth';
import { ProfileStats, FarmerProduct, UserProfile } from '../../types/profile';
import { uploadFile } from '../../lib/supabase/storage';
import { EXCHANGE_RATE_VND_USDC } from '../../lib/solana/convertVndUsdc';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const { wallet, publicKey, connected: walletConnected, select, wallets, balance, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [products, setProducts] = useState<FarmerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  // New Product state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    ten_san_pham: '',
    so_luong_uoc_tinh: '',
    gia_tham_khao: '',
    mo_ta: '',
    mua_vu: ''
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isUploadingProductImg, setIsUploadingProductImg] = useState(false);
  const productImgInputRef = React.useRef<HTMLInputElement>(null);

  // Upload state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleProductImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const files = Array.from(e.target.files);
    setIsUploadingProductImg(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file, 'profiles', `${user.dia_chi_vi}/products`);
        if (url) {
          urls.push(url);
        }
      }
      setProductImages(prev => [...prev, ...urls]);
    } catch (err) {
      alert('Lỗi upload: ' + (err as any).message);
    } finally {
      setIsUploadingProductImg(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'anh_bia' | 'anh_dai_dien') => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    
    if (field === 'anh_bia') setIsUploadingCover(true);
    else setIsUploadingAvatar(true);

    try {
      const url = await uploadFile(file, 'profiles', user.dia_chi_vi);
      if (url) {
        const updated = await updateUserProfile(user.dia_chi_vi, { [field]: url });
        setDbUser(updated as UserProfile);
        setEditForm(prev => ({...prev, [field]: url}));
      } else {
        alert('Upload ảnh thất bại.');
      }
    } catch (err) {
      alert('Lỗi upload: ' + (err as any).message);
    } finally {
      if (field === 'anh_bia') setIsUploadingCover(false);
      else setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('nguoi_dung')
          .select('*')
          .eq('dia_chi_vi', user.dia_chi_vi)
          .single();
          
        if (profileData) {
          setDbUser(profileData as UserProfile);
          setEditForm(profileData);
        }

        // Fetch Stats
        const profileStats = await getProfileStats(user.dia_chi_vi);
        setStats(profileStats);

        // Fetch Products (if farmer)
        if (user.vai_tro === 'nong_dan') {
          const farmerProducts = await getFarmerProductsByWallet(user.dia_chi_vi);
          setProducts(farmerProducts);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading) {
      if (user) {
        fetchData();
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  const handleSaveProfile = async () => {
    if (!user || !dbUser) return;
    setIsSaving(true);
    try {
      const updatedProfile = await updateUserProfile(user.dia_chi_vi, editForm);
      setDbUser(updatedProfile as UserProfile);
      setIsEditing(false);
      // Cập nhật session nếu có thay đổi tên
      updateUser({
        ...user,
        ten_hien_thi: updatedProfile.ten_hien_thi || user.ten_hien_thi,
        ho_ten: updatedProfile.ho_ten,
        so_dien_thoai: updatedProfile.so_dien_thoai,
      });
    } catch (err) {
      alert('Không thể lưu thông tin: ' + (err as any).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProduct(true);
    try {
      const addedProduct = await createFarmerProduct({
        vi_nong_dan: user.dia_chi_vi,
        ...newProduct,
        hinh_anh: productImages
      });
      setProducts([addedProduct, ...products]);
      setIsAddingProduct(false);
      setNewProduct({ ten_san_pham: '', so_luong_uoc_tinh: '', gia_tham_khao: '', mo_ta: '', mua_vu: '' });
      setProductImages([]);
    } catch (err) {
      alert('Không thể thêm sản phẩm: ' + (err as any).message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await deleteFarmerProduct(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      alert('Không thể xóa sản phẩm.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-[#15803D]" />
        <span className="font-semibold text-slate-500">Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (!user || !dbUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-2xl mb-2">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy hồ sơ!</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Phiên đăng nhập của bạn có thể đã cũ hoặc dữ liệu đã được làm mới bởi Admin. Vui lòng đăng nhập lại để đồng bộ dữ liệu mới nhất.
        </p>
        <button 
          onClick={logout}
          className="mt-4 px-6 py-2.5 bg-[#15803D] text-white rounded-xl font-semibold hover:bg-[#166534] transition-colors"
        >
          Đăng xuất và Đăng nhập lại
        </button>
      </div>
    );
  }

  const isNongDan = dbUser.vai_tro === 'nong_dan';
  const roleLabel = isNongDan ? 'NÔNG DÂN' : 'THƯƠNG LÁI';
  const roleColor = isNongDan ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200';
  const joinedDate = dbUser.ngay_tao ? new Date(dbUser.ngay_tao).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Không xác định';

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-1">
              <ChevronLeft size={20} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-[#15803D] flex items-center justify-center text-white font-black text-lg shadow-md">A</div>
            <Link href="/" className="text-lg font-extrabold tracking-tight text-slate-900 hover:text-[#15803D] transition-colors">
              AgriTrust
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <WalletBalance />
            <ConnectWalletButton />
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="text-right group cursor-pointer flex flex-col justify-center h-full">
                <p className="text-sm font-bold text-slate-700 group-hover:text-[#15803D] transition-colors">
                  {dbUser.ten_hien_thi}
                </p>
              </div>
              <button onClick={logout} className="p-1.5 ml-2 text-slate-400 hover:text-red-500 transition-colors" title="Đăng xuất">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 animate-fade-in-up">
        {/* Hidden inputs for file upload */}
        <input type="file" accept="image/*" ref={coverInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'anh_bia')} />
        <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'anh_dai_dien')} />

        {/* Cover & Avatar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          {/* Ảnh Bìa (Cover) */}
          <div className="h-48 w-full bg-slate-200 relative group">
            {dbUser.anh_bia ? (
              <img src={dbUser.anh_bia} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${isNongDan ? 'from-[#15803D] to-emerald-400' : 'from-indigo-600 to-indigo-400'}`}></div>
            )}
            
            {/* Nút Upload Ảnh Bìa */}
            <button 
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploadingCover}
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100"
            >
              {isUploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              Đổi ảnh bìa
            </button>
          </div>
          
          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-16 mb-4">
              
              {/* Ảnh Đại Diện (Avatar) */}
              <div className="relative group">
                <div className="w-32 h-32 bg-white rounded-full p-1.5 shadow-md relative z-10">
                  <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden relative">
                    {dbUser.anh_dai_dien ? (
                      <img src={dbUser.anh_dai_dien} alt="avatar" className="w-full h-full object-cover"/>
                    ) : (
                      <UserCircle size={80} strokeWidth={1} />
                    )}
                    
                    {/* Nút Upload Avatar (hiện khi hover) */}
                    <button 
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isUploadingAvatar ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="pb-2 flex gap-2">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${roleColor} shadow-sm`}>
                  {roleLabel}
                </span>
                {dbUser.trang_thai_xac_thuc !== 'chua_xac_thuc' && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                    <ShieldCheck size={14} /> 
                    {dbUser.trang_thai_xac_thuc === 'da_xac_thuc_ho_so' ? 'Đã xác thực hồ sơ' : 'Đã xác thực SĐT'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  {dbUser.ten_hien_thi}
                </h1>
                <p className="text-slate-500 font-medium text-sm mt-1">@{dbUser.ten_dang_nhap}</p>
              </div>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Edit3 size={16} /> Chỉnh sửa
                </button>
              )}
            </div>

            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <Calendar size={16} className="text-slate-400" /> Tham gia: {joinedDate}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <MapPin size={16} className="text-slate-400" /> {dbUser.khu_vuc || dbUser.khu_vuc_thu_mua || 'Chưa cập nhật khu vực'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          
          {/* Thông tin cá nhân & Nghề nghiệp (2/3 width) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* THÔNG TIN CÁ NHÂN */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserCircle size={20} className={isNongDan ? "text-[#15803D]" : "text-indigo-600"} />
                Thông tin Cá nhân
              </h2>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Tên hiển thị</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.ten_hien_thi || ''} onChange={e => setEditForm({...editForm, ten_hien_thi: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Họ và tên thật</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.ho_ten || ''} onChange={e => setEditForm({...editForm, ho_ten: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Số điện thoại</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.so_dien_thoai || ''} onChange={e => setEditForm({...editForm, so_dien_thoai: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Khu vực</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.khu_vuc || editForm.khu_vuc_thu_mua || ''} onChange={e => isNongDan ? setEditForm({...editForm, khu_vuc: e.target.value}) : setEditForm({...editForm, khu_vuc_thu_mua: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Địa chỉ chi tiết</label>
                    <textarea className="w-full px-3 py-2 border rounded-xl text-sm" rows={2} value={editForm.dia_chi || ''} onChange={e => setEditForm({...editForm, dia_chi: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Mô tả bản thân</label>
                    <textarea className="w-full px-3 py-2 border rounded-xl text-sm" rows={2} value={editForm.mo_ta_ban_than || ''} onChange={e => setEditForm({...editForm, mo_ta_ban_than: e.target.value})} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Họ và tên</p>
                    <p className="font-medium text-slate-900">{dbUser.ho_ten || <span className="italic text-slate-400">Chưa cập nhật</span>}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Số điện thoại</p>
                    <p className="font-medium text-slate-900 flex items-center gap-1.5">
                      {dbUser.so_dien_thoai ? <><Phone size={14} className="text-slate-400"/> {dbUser.so_dien_thoai}</> : <span className="italic text-slate-400">Chưa cập nhật</span>}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Địa chỉ</p>
                    <p className="font-medium text-slate-900">{dbUser.dia_chi || <span className="italic text-slate-400">Chưa cập nhật</span>}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Giới thiệu</p>
                    <p className="font-medium text-slate-900">{dbUser.mo_ta_ban_than || <span className="italic text-slate-400">Chưa cập nhật</span>}</p>
                  </div>
                </div>
              )}
            </div>

            {/* THÔNG TIN NGHỀ NGHIỆP */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase size={20} className={isNongDan ? "text-[#15803D]" : "text-indigo-600"} />
                {isNongDan ? 'Thông tin Nông trại / HTX' : 'Thông tin Doanh nghiệp'}
              </h2>
              
              {isEditing ? (
                <div className="space-y-4">
                  {isNongDan ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Tên Nông trại/HTX</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.ten_nong_trai || ''} onChange={e => setEditForm({...editForm, ten_nong_trai: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Diện tích</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="VD: 5 ha" value={editForm.dien_tich || ''} onChange={e => setEditForm({...editForm, dien_tich: e.target.value})} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Sản phẩm chính</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.san_pham_chinh || ''} onChange={e => setEditForm({...editForm, san_pham_chinh: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Chứng nhận</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="VD: VietGAP" value={editForm.chung_nhan || ''} onChange={e => setEditForm({...editForm, chung_nhan: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Kinh nghiệm</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.kinh_nghiem || ''} onChange={e => setEditForm({...editForm, kinh_nghiem: e.target.value})} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Tên công ty</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.ten_cong_ty || ''} onChange={e => setEditForm({...editForm, ten_cong_ty: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Lĩnh vực thu mua</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" value={editForm.linh_vuc_thu_mua || ''} onChange={e => setEditForm({...editForm, linh_vuc_thu_mua: e.target.value})} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  {isNongDan ? (
                    <>
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Tên Nông trại/HTX</p>
                        <p className="font-medium text-slate-900">{dbUser.ten_nong_trai || <span className="italic text-slate-400">-</span>}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Diện tích canh tác</p>
                        <p className="font-medium text-slate-900">{dbUser.dien_tich || <span className="italic text-slate-400">-</span>}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Sản phẩm chính</p>
                        <p className="font-medium text-slate-900">{dbUser.san_pham_chinh || <span className="italic text-slate-400">-</span>}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Chứng nhận đạt được</p>
                        <p className="font-medium text-slate-900">
                          {dbUser.chung_nhan ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold text-xs border border-emerald-100">{dbUser.chung_nhan}</span> : <span className="italic text-slate-400">-</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Kinh nghiệm</p>
                        <p className="font-medium text-slate-900">{dbUser.kinh_nghiem || <span className="italic text-slate-400">-</span>}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Tên Công ty</p>
                        <p className="font-medium text-slate-900">{dbUser.ten_cong_ty || <span className="italic text-slate-400">-</span>}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Lĩnh vực thu mua</p>
                        <p className="font-medium text-slate-900">{dbUser.linh_vuc_thu_mua || <span className="italic text-slate-400">-</span>}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS (khi đang edit) */}
              {isEditing && (
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => { setIsEditing(false); setEditForm(dbUser); }}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#15803D] hover:bg-[#166534] text-white font-bold rounded-xl flex items-center gap-2 shadow-md"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    Lưu thông tin
                  </button>
                </div>
              )}
            </div>

            {/* QUẢN LÝ SẢN PHẨM (Chỉ Nông dân) */}
            {isNongDan && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Package size={20} className="text-[#15803D]" />
                    Sản phẩm của tôi
                  </h2>
                  <button 
                    onClick={() => setIsAddingProduct(!isAddingProduct)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-[#15803D] bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                  >
                    {isAddingProduct ? <X size={16} /> : <Plus size={16} />} 
                    {isAddingProduct ? 'Đóng' : 'Thêm sản phẩm'}
                  </button>
                </div>

                {/* Form thêm sản phẩm */}
                {isAddingProduct && (
                  <form onSubmit={handleAddProduct} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Tên sản phẩm *</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="VD: Lúa ST25" value={newProduct.ten_san_pham} onChange={e => setNewProduct({...newProduct, ten_san_pham: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Sản lượng dự kiến *</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="VD: 5 Tấn" value={newProduct.so_luong_uoc_tinh} onChange={e => setNewProduct({...newProduct, so_luong_uoc_tinh: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Giá tham khảo</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="VD: 8,500 VNĐ/kg" value={newProduct.gia_tham_khao} onChange={e => setNewProduct({...newProduct, gia_tham_khao: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Mùa vụ</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="VD: Đông Xuân 2026" value={newProduct.mua_vu} onChange={e => setNewProduct({...newProduct, mua_vu: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Mô tả thêm</label>
                      <textarea className="w-full px-3 py-2 border rounded-xl text-sm" rows={2} value={newProduct.mo_ta} onChange={e => setNewProduct({...newProduct, mo_ta: e.target.value})}></textarea>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-2 block">Hình ảnh sản phẩm</label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        ref={productImgInputRef} 
                        className="hidden" 
                        onChange={handleProductImgUpload} 
                      />
                      <div className="flex flex-wrap gap-3 items-center">
                        <button
                          type="button"
                          onClick={() => productImgInputRef.current?.click()}
                          disabled={isUploadingProductImg}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition-all gap-1"
                        >
                          {isUploadingProductImg ? (
                            <Loader2 className="animate-spin text-slate-400" size={20} />
                          ) : (
                            <>
                              <Plus size={20} />
                              <span className="text-[10px] font-bold">Thêm ảnh</span>
                            </>
                          )}
                        </button>
                        
                        {productImages.map((img, idx) => (
                          <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 relative group shrink-0">
                            <img src={img} alt="Product preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={isSavingProduct} className="px-5 py-2 bg-[#15803D] hover:bg-[#166534] text-white font-bold rounded-xl flex items-center gap-2">
                        {isSavingProduct ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Lưu sản phẩm
                      </button>
                    </div>
                  </form>
                )}

                {/* Danh sách sản phẩm */}
                <div className="space-y-4">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Chưa có sản phẩm nào. Bấm Thêm sản phẩm để bắt đầu.</div>
                  ) : (
                    products.map(p => (
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white hover:border-emerald-200 hover:shadow-sm transition-all gap-4">
                        <div className="flex gap-4 items-center">
                          {p.hinh_anh && p.hinh_anh.length > 0 ? (
                            <img src={p.hinh_anh[0]} alt={p.ten_san_pham} className="w-16 h-16 rounded-xl object-cover border border-slate-150 shrink-0" />
                          ) : (
                            <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-150">
                              <Package size={24} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900">{p.ten_san_pham}</h3>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full uppercase">{p.trang_thai}</span>
                            </div>
                            <p className="text-sm text-slate-500 mb-2">{p.mo_ta}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium">
                              <span className="text-slate-600"><b className="text-slate-800">Sản lượng:</b> {p.so_luong_uoc_tinh || '-'}</span>
                              <span className="text-emerald-700"><b className="text-slate-800">Giá:</b> {p.gia_tham_khao || '-'}</span>
                              <span className="text-slate-600"><b className="text-slate-800">Mùa vụ:</b> {p.mua_vu || '-'}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: Thống kê & Ví */}
          <div className="space-y-6">
            
            {/* THỐNG KÊ (Cải tiến #6) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award size={20} className={isNongDan ? "text-[#15803D]" : "text-indigo-600"} />
                Thống kê Liên hệ
              </h2>
              
              {stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Yêu cầu</p>
                      <p className="text-2xl font-black text-slate-800">{stats.tong_yeu_cau}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Đồng ý</p>
                      <p className="text-2xl font-black text-emerald-700">{stats.da_dong_y}</p>
                    </div>
                  </div>
                  <div className="bg-[#15803D] text-white p-5 rounded-xl text-center shadow-md shadow-emerald-900/10">
                    <p className="text-xs font-bold text-emerald-200 uppercase tracking-wide mb-1">Hợp đồng Thành công</p>
                    <p className="text-4xl font-black">{stats.hop_dong_thanh_cong}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div>
              )}
            </div>

            {/* VÍ ĐIỆN TỬ (CỔNG BLOCKCHAIN WEB3 CHUYÊN NGHIỆP) */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-950/30 p-7 border border-slate-800 transition-all">
              {/* Glow decorations */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#512DA8]/20 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#15803D]/10 rounded-full blur-[50px] -ml-16 -mb-16 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col gap-6">
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-800 gap-2">
                  <h2 className="text-xs font-black tracking-wider text-slate-200 uppercase flex items-center gap-2 whitespace-nowrap">
                    <Wallet size={16} className="text-[#AB9FF2] stroke-[2.5]" />
                    Ví Blockchain
                  </h2>
                  {walletConnected ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Đã kết nối
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Chưa kết nối
                    </span>
                  )}
                </div>

                {walletConnected ? (
                  <div className="flex flex-col gap-5">
                    {/* Wallet Detail & Disconnect */}
                    <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-4 py-3 rounded-2xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                          {wallet?.adapter?.icon ? (
                            <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-5 h-5 rounded" />
                          ) : (
                            <Wallet size={16} className="text-[#AB9FF2]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{wallet?.adapter?.name || 'Ví Solana'}</p>
                          <p className="text-[9px] text-emerald-400 font-extrabold tracking-widest uppercase whitespace-nowrap">Solana Devnet</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => disconnect()}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
                        title="Ngắt kết nối ví"
                      >
                        <LogOut size={16} />
                      </button>
                    </div>

                    {/* Real Solana Balance Display */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Số dư tài sản</p>
                      <div className="flex justify-between items-end gap-2 flex-wrap">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-white font-mono tracking-tight">
                            {balance.toFixed(4)}
                          </span>
                          <span className="text-xs font-bold text-[#AB9FF2]">SOL</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 font-mono pb-1 select-all">
                          ~{(balance * EXCHANGE_RATE_VND_USDC).toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Elegant Unconnected Onboarding */
                  <div className="py-4 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#512DA8]/20 to-[#AB9FF2]/10 border border-[#512DA8]/30 text-[#AB9FF2] flex items-center justify-center shadow-lg shadow-[#512DA8]/5">
                      <Wallet size={26} className="stroke-[1.5]" />
                    </div>
                    <div className="space-y-1.5 max-w-[260px]">
                      <h3 className="font-bold text-sm text-slate-200">Liên kết ví Phantom</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Yêu cầu kết nối ví Phantom để ký hợp đồng số hóa nông sản, xác thực minh bạch thông tin giao dịch trên mạng lưới Solana Blockchain.
                      </p>
                    </div>
                  </div>
                )}

                {/* Public Key Display (For both connected and saved profile address) */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Địa chỉ ví công khai (Public Key)</p>
                  <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 px-4 py-3.5 rounded-2xl">
                    <span className="text-xs font-mono text-slate-300 truncate tracking-wide select-all">
                      {publicKey ? publicKey.toBase58() : (dbUser.dia_chi_vi || 'Chưa cập nhật')}
                    </span>
                    <button 
                      onClick={() => {
                        const addr = publicKey ? publicKey.toBase58() : dbUser.dia_chi_vi;
                        if (addr) {
                          navigator.clipboard.writeText(addr);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="Sao chép địa chỉ ví"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Mismatch Alert */}
                {walletConnected && publicKey && dbUser.dia_chi_vi && publicKey.toBase58() !== dbUser.dia_chi_vi && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-[11px] text-red-400 font-medium leading-relaxed">
                      ⚠️ <strong className="text-red-300">Sai địa chỉ ví!</strong> Ví đang kết nối khác với ví đăng ký trên hồ sơ. Vui lòng chuyển Account trên Phantom.
                    </p>
                  </div>
                )}

                {/* Action Connect Button */}
                {!walletConnected && (
                  <button 
                    onClick={() => setVisible(true)} 
                    className="w-full py-3.5 bg-gradient-to-r from-[#512DA8] to-[#673AB7] hover:from-[#5E35B1] hover:to-[#7E57C2] text-white rounded-2xl text-sm font-extrabold transition-all shadow-lg shadow-[#512DA8]/20 flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Kết nối ví Phantom
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform opacity-80" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
