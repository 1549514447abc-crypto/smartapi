import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/common';

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // 直接返回data
    return response.data;
  },
  (error: AxiosError<ApiResponse>) => {
    // 处理错误响应
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // 未授权，清除token并跳转登录
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // 如果不是在登录页，跳转到登录页
          const basePath = import.meta.env.BASE_URL || '/';
          const loginPath = `${basePath}login`.replace(/\/\//g, '/');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = loginPath;
          }
          break;
        case 403:
          console.error('Permission denied');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error('Request failed:', data?.message || error.message);
      }

      return Promise.reject(data || error);
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('No response from server');
      return Promise.reject({ message: 'No response from server' });
    } else {
      // 请求配置错误
      console.error('Request config error:', error.message);
      return Promise.reject({ message: error.message });
    }
  }
);

// 封装常用方法
export const api = {
  get: <T = any>(url: string, config?: any): Promise<T> => {
    return request.get(url, config);
  },

  post: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return request.post(url, data, config);
  },

  put: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return request.put(url, data, config);
  },

  delete: <T = any>(url: string, config?: any): Promise<T> => {
    return request.delete(url, config);
  },

  patch: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return request.patch(url, data, config);
  }
};

export default request;
