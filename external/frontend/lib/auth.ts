/** Authentication utilities. */

import api from './api';

export interface User {
  id: number;
  username: string;
  name: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  console.group('[Auth Login] Starting login request');
  console.log('Endpoint: /auth/login');
  console.log('Username:', username);
  console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
  
  try {
    const response = await api.post<LoginResponse>('/auth/login', {
      username,
      password,
    });
    
    console.log('[Auth Login] Success');
    console.log('Response:', response.data);
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Cookies set:', document.cookie);
    console.groupEnd();
    
    return response.data;
  } catch (error: any) {
    console.error('[Auth Login] Error');
    console.error('Error object:', error);
    console.error('Response:', error.response);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    console.groupEnd();
    throw error;
  }
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api.get<User>('/auth/me');
    return response.data;
  } catch (error) {
    return null;
  }
}

export function isAuthenticated(): boolean {
  // Simple check - in production, verify with server
  if (typeof document !== 'undefined') {
    return document.cookie.includes('session=');
  }
  return false;
}

