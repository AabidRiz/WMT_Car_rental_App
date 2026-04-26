import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import axios from 'axios';

export const AuthContext = createContext();

export const API_URL = Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://192.168.43.200:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [splashLoading, setSplashLoading] = useState(true);

  if (user && user.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
  }

  const loadUser = async () => {
    try {
      const storedUser = Platform.OS === 'web' 
        ? localStorage.getItem('userInfo') 
        : await SecureStore.getItemAsync('userInfo');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSplashLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      setUser(res.data);
      if (Platform.OS === 'web') {
        localStorage.setItem('userInfo', JSON.stringify(res.data));
      } else {
        await SecureStore.setItemAsync('userInfo', JSON.stringify(res.data));
      }
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message || 'Login Failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, phone) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, { name, email, password, phone });
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message || 'Registration Failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('userInfo');
      } else {
        await SecureStore.deleteItemAsync('userInfo');
      }
    } catch(e) {}
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    setIsLoading(false);
  };

  const forgotPassword = async (email, newPassword) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email, newPassword });
      return { success: true };
    } catch(e) {
      return { success: false, message: e.response?.data?.message || 'Failed to reset password' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (name, email, profilePicture, password, phone) => {
    setIsLoading(true);
    try {
      const res = await axios.put(`${API_URL}/auth/profile`, { userId: user._id, email, name, profilePicture, password, phone });
      const updatedUser = { ...user, ...res.data };
      setUser(updatedUser);
      if (Platform.OS === 'web') {
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      } else {
        await SecureStore.setItemAsync('userInfo', JSON.stringify(updatedUser));
      }
      return { success: true };
    } catch(e) {
      return { success: false, message: e.response?.data?.message || 'Failed to update profile' };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, isLoading, splashLoading, login, register, logout, forgotPassword, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
