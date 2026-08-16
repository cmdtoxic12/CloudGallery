document.addEventListener('DOMContentLoaded', () => {
  // Toggle password visibility
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  });

  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    utils.redirectIfLoggedIn();

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        utils.showToast('Passwords do not match', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creating account...';

      try {
        const res = await api.register({ name, email, password, confirmPassword });
        utils.setAuth(res.data.user, res.data.token);
        utils.showToast('Account created successfully!', 'success');
        setTimeout(() => (window.location.href = 'dashboard.html'), 800);
      } catch (err) {
        utils.showToast(err.message || 'Registration failed', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
      }
    });
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    utils.redirectIfLoggedIn();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Signing in...';

      try {
        const res = await api.login({ email, password });
        utils.setAuth(res.data.user, res.data.token);
        utils.showToast('Welcome back!', 'success');
        setTimeout(() => (window.location.href = 'dashboard.html'), 600);
      } catch (err) {
        utils.showToast(err.message || 'Login failed', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
      }
    });
  }
});
