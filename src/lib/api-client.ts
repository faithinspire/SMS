import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse, ApiError } from '@/types'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

class ApiClient {
  private client: AxiosInstance

  constructor(baseUrl: string = apiBaseUrl) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add interceptor to attach JWT token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    )
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  private handleError(error: AxiosError): Promise<never> {
    const apiError: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    }

    if (error.response) {
      const data = error.response.data as any
      apiError.statusCode = error.response.status
      apiError.code = data?.error?.code || `HTTP_${error.response.status}`
      apiError.message = data?.error?.message || data?.message || error.message
      apiError.details = data?.error?.details
    } else if (error.request) {
      apiError.code = 'NETWORK_ERROR'
      apiError.message = 'Network error. Please check your connection.'
    }

    return Promise.reject(apiError)
  }

  async get<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url)
    return response.data
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data)
    return response.data
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data)
    return response.data
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data)
    return response.data
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url)
    return response.data
  }
}

export const apiClient = new ApiClient()
