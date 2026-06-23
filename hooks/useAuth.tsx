'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  dia_chi_vi: string;
  vai_tro: 'nong_dan' | 'thuong_lai';
  ten_dang_nhap: string;
  ten_hien_thi: string;
  // Các trường profile bổ sung
  ho_ten?: string;
  so_dien_thoai?: string;
  dia_chi?: string;
  anh_dai_dien?: string;
  trang_thai_xac_thuc?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (userData: AuthUser, redirectPath?: string | null) => void;
  logout: () => void;
  updateUser: (userData: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Khôi phục phiên đăng nhập từ localStorage khi khởi động
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('agritrust_session');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Không thể phục hồi session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData: AuthUser, redirectPath?: string | null) => {
    setUser(userData);
    localStorage.setItem('agritrust_session', JSON.stringify(userData));

    // Đồng bộ thông tin tài khoản (bao gồm cả tài khoản Khách) vào Database
    import('../lib/supabase/client').then(async ({ supabase }) => {
      const { error } = await supabase.from('nguoi_dung').insert({
        dia_chi_vi: userData.dia_chi_vi,
        vai_tro: userData.vai_tro,
        ten_dang_nhap: userData.ten_dang_nhap,
        mat_khau: '123456',
        ten_hien_thi: userData.ten_hien_thi
      });
      if (error && error.code !== '23505') {
        console.error('Lỗi khi đồng bộ tài khoản vào DB:', error.message);
      }
    });

    if (redirectPath !== null) {
      router.push(redirectPath || '/');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('agritrust_session');
    router.push('/login');
  };

  const updateUser = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem('agritrust_session', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được đặt bên trong AuthProvider');
  }
  return context;
};
