const modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  close(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach((el) => {
      el.classList.remove('open');
    });
    document.body.style.overflow = '';
  },
};

// Close on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modal.closeAll();
    const lb = document.getElementById('lightbox');
    if (lb && lb.classList.contains('open')) {
      lb.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
});

window.modal = modal;
