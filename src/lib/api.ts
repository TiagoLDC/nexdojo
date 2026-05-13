import axios from 'axios';

let _token: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export const setApiToken = (token: string | null) => {
  _token = token;
};

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler;
};

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, (c) => '_' + c.toLowerCase());
}

function transformKeys(obj: unknown, transform: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((v) => transformKeys(v, transform));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        transform(k),
        transformKeys(v, transform),
      ]),
    );
  }
  return obj;
}

const defaultBaseURL = import.meta.env.PROD ? '/api' : 'http://localhost:3005/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? defaultBaseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  if (
    config.data &&
    typeof config.data === 'object' &&
    ['post', 'put', 'patch'].includes((config.method ?? '').toLowerCase())
  ) {
    config.data = transformKeys(config.data, camelToSnake);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = transformKeys(response.data, snakeToCamel);
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      _onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
