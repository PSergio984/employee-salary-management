import { apiClient } from './client.js';
import { AuthSession } from '../types/auth.js';

export async function loginApi(
  username: string,
  password: string,
): Promise<AuthSession> {
  return apiClient<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getSessionApi(): Promise<AuthSession> {
  return apiClient<AuthSession>('/api/auth/me', {
    method: 'GET',
  });
}

export async function logoutApi(): Promise<void> {
  await apiClient<void>('/api/auth/logout', {
    method: 'POST',
  });
}
