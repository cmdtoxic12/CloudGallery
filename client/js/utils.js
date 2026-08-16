const utils = {
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('cg_user'));
    } catch {
      return null;
    }
  },

  setAuth(user, token) {
    localStorage.setItem('cg_token', token);
    localStorage.setItem('cg_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('cg_token');
    localStorage.removeItem('cg_user');
  },

  isLoggedIn() {
    return !!localStorage.getItem('cg_token');
  },

  requireAuth() {
    if (!utils.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  redirectIfLoggedIn() {
    if (utils.isLoggedIn()) {
      window.location.href = 'dashboard.html';
    }
  },

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
    };
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  getShareUrl(slug) {
    const base = window.location.origin;
    // Use public gallery page
    return `${base}/gallery.html?g=${slug}`;
  },

  copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
  },

  initTheme() {
    const saved = localStorage.getItem('cg_theme');
    if (saved === 'dark') {
      document.body.classList.add('dark-mode');
    }
  },

  toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('cg_theme', isDark ? 'dark' : 'light');
  },
};

// Init theme immediately
utils.initTheme();

window.utils = utils;
