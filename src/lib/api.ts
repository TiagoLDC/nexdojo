import axios from 'axios';

let _token: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export const setApiToken = (token: string | null) => {
  _token = token;
};

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      _onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
