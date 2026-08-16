const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

const getToken = () => localStorage.getItem('cg_token');

const api = {
  async request(endpoint, options = {}) {
    const headers = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await res.json();

      if (!res.ok) {
        const error = new Error(data.message || 'Request failed');
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.status === 401 && !endpoint.includes('/auth/')) {
        // Token expired – clear and redirect
        localStorage.removeItem('cg_token');
        localStorage.removeItem('cg_user');
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
          // Soft handling – let caller decide
        }
      }
      throw err;
    }
  },

  // Auth
  register: (body) => api.request('/auth/register', { method: 'POST', body }),
  login: (body) => api.request('/auth/login', { method: 'POST', body }),
  getMe: () => api.request('/auth/me'),
  logout: () => api.request('/auth/logout', { method: 'POST' }),

  // Galleries
  getGalleries: () => api.request('/galleries'),
  createGallery: (body) => api.request('/galleries', { method: 'POST', body }),
  getGalleryById: (id) => api.request(`/galleries/${id}`),
  getGalleryBySlug: (slug) => api.request(`/galleries/slug/${slug}`),
  unlockGallery: (slug, password) =>
    api.request(`/galleries/slug/${slug}/unlock`, { method: 'POST', body: { password } }),
  updateGallery: (id, body) => api.request(`/galleries/${id}`, { method: 'PUT', body }),
  deleteGallery: (id) => api.request(`/galleries/${id}`, { method: 'DELETE' }),
  getStats: () => api.request('/galleries/stats'),
  trackShare: (id, platform) =>
    api.request(`/galleries/${id}/share`, { method: 'POST', body: { platform } }),

  // Photos
  uploadPhotos: (galleryId, formData) => {
    formData.append('galleryId', galleryId);
    return api.request('/photos/upload', { method: 'POST', body: formData });
  },
  getGalleryPhotos: (galleryId, page = 1, limit = 50) =>
    api.request(`/photos/gallery/${galleryId}?page=${page}&limit=${limit}`),
  getPhoto: (id) => api.request(`/photos/${id}`),
  deletePhoto: (id) => api.request(`/photos/${id}`, { method: 'DELETE' }),
  toggleFavorite: (id) => api.request(`/photos/${id}/favorite`, { method: 'POST' }),
  getFavorites: () => api.request('/photos/favorites'),
  trackDownload: (id) => api.request(`/photos/${id}/download`, { method: 'POST' }),

  // User
  updateProfile: (body) => api.request('/users/profile', { method: 'PUT', body }),
  changePassword: (body) => api.request('/users/password', { method: 'PUT', body }),
};

window.api = api;
