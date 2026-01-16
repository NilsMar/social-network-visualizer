// In production, API is served from the same origin
// In development, Vite proxy handles /api requests
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (err) {
      throw new Error('Unable to connect to server. Please check if the server is running.');
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return {};
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('Invalid response from server');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth endpoints
  async register(email, password, name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Network data endpoints
  async getNetworkData() {
    return this.request('/network');
  }

  async saveNetworkData(nodes, links, customGroups = {}, defaultColorOverrides = {}, deletedDefaultCategories = []) {
    return this.request('/network', {
      method: 'PUT',
      body: JSON.stringify({ nodes, links, customGroups, defaultColorOverrides, deletedDefaultCategories }),
    });
  }

  async resetNetworkData() {
    return this.request('/network/reset', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
