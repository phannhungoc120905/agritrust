'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  dia_chi_vi: string;
  vai_tro: 'nong_dan' | 'thuong_lai';
  ten_dang_nhap: string;
  ten_hien_thi: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (userData: AuthUser) => void;
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

  const login = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem('agritrust_session', JSON.stringify(userData));
    router.push('/');
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
