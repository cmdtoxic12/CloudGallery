const uploadManager = {
  files: [],
  galleryId: null,

  init(galleryId) {
    this.galleryId = galleryId;
    this.files = [];

    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('photoInput');

    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });

    input.addEventListener('change', () => {
      this.handleFiles(input.files);
      input.value = '';
    });
  },

  handleFiles(fileList) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const maxSize = 15 * 1024 * 1024;

    Array.from(fileList).forEach((file) => {
      if (!allowed.includes(file.type)) {
        utils.showToast(`${file.name}: Invalid format`, 'warning');
        return;
      }
      if (file.size > maxSize) {
        utils.showToast(`${file.name}: File too large (max 15MB)`, 'warning');
        return;
      }
      this.files.push(file);
    });

    this.renderProgress();
    if (this.files.length > 0) {
      this.startUpload();
    }
  },

  renderProgress() {
    const container = document.getElementById('uploadProgress');
    if (!container) return;

    if (this.files.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.files
      .map(
        (f, i) => `
      <div class="upload-item" id="upload-item-${i}">
        <span class="upload-item-name">${f.name}</span>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:0%"></div></div>
        <span class="upload-status text-muted" style="font-size:0.8rem;min-width:60px">Waiting</span>
      </div>
    `
      )
      .join('');
  },

  async startUpload() {
    if (!this.galleryId || this.files.length === 0) return;

    const formData = new FormData();
    this.files.forEach((f) => formData.append('photos', f));

    // Update UI to uploading
    this.files.forEach((_, i) => {
      const el = document.getElementById(`upload-item-${i}`);
      if (el) {
        el.querySelector('.progress-bar-fill').style.width = '40%';
        el.querySelector('.upload-status').textContent = 'Uploading...';
      }
    });

    try {
      const res = await api.uploadPhotos(this.galleryId, formData);

      this.files.forEach((_, i) => {
        const el = document.getElementById(`upload-item-${i}`);
        if (el) {
          el.querySelector('.progress-bar-fill').style.width = '100%';
          el.querySelector('.upload-status').textContent = '✅ Done';
          el.querySelector('.upload-status').style.color = 'var(--success)';
        }
      });

      utils.showToast(res.message || 'Photos uploaded!', 'success');
      this.files = [];

      // Refresh photo grid
      if (typeof loadPhotos === 'function') {
        setTimeout(() => loadPhotos(), 800);
      }
    } catch (err) {
      this.files.forEach((_, i) => {
        const el = document.getElementById(`upload-item-${i}`);
        if (el) {
          el.querySelector('.upload-status').textContent = '❌ Failed';
          el.querySelector('.upload-status').style.color = 'var(--danger)';
        }
      });
      utils.showToast(err.message || 'Upload failed', 'error');
    }
  },
};

window.uploadManager = uploadManager;
