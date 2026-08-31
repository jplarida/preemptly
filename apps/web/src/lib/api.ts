const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('retailer_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('retailer_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('retailer_token');
    }
  }

  async fetch(path: string, options: RequestInit = {}) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  get(path: string) { return this.fetch(path); }
  post(path: string, data: any) { return this.fetch(path, { method: 'POST', body: JSON.stringify(data) }); }
  put(path: string, data: any) { return this.fetch(path, { method: 'PUT', body: JSON.stringify(data) }); }
  patch(path: string, data: any) { return this.fetch(path, { method: 'PATCH', body: JSON.stringify(data) }); }
}

export const api = new ApiClient();
