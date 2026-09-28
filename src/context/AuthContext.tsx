"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { showError } from '@/utils/toast';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isTeacherAuthenticated') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // Sync with localStorage whenever isAuthenticated changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('isTeacherAuthenticated', String(isAuthenticated));
    }
  }, [isAuthenticated]);

  const login = (password: string) => {
    const teacherPassword = import.meta.env.VITE_TEACHER_PASSWORD;
    if (password === teacherPassword) {
      setIsAuthenticated(true);
      return true;
    } else {
      showError("Incorrect password.");
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};