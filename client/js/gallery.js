let currentGallery = null;
let photos = [];
let currentPhotoIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const galleryId = params.get('id');
  const slug = params.get('g');

  // Theme toggle
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => utils.toggleTheme());
  });

  // Logout
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await api.logout(); } catch {}
      utils.clearAuth();
      window.location.href = 'index.html';
    });
  });

  if (galleryId) {
    // Owner view – requires auth
    if (!utils.requireAuth()) return;
    await loadOwnerGallery(galleryId);
  } else if (slug) {
    // Public view
    await loadPublicGallery(slug);
  } else {
    window.location.href = 'dashboard.html';
  }
});

async function loadOwnerGallery(id) {
  try {
    const res = await api.getGalleryById(id);
    currentGallery = res.data.gallery;
    renderGalleryHeader(currentGallery, true);
    uploadManager.init(id);
    await loadPhotos();
  } catch (err) {
    utils.showToast(err.message || 'Failed to load gallery', 'error');
    setTimeout(() => (window.location.href = 'dashboard.html'), 1500);
  }
}

async function loadPublicGallery(slug) {
  try {
    const res = await api.getGalleryBySlug(slug);
    currentGallery = res.data.gallery;
    renderGalleryHeader(currentGallery, false);
    await loadPhotos();
  } catch (err) {
    if (err.data?.requiresPassword) {
      showPasswordForm(slug);
      return;
    }
    document.getElementById('galleryMain').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-lock"></i>
        <h3>Gallery unavailable</h3>
        <p>${err.message || 'This gallery could not be loaded.'}</p>
        <a href="index.html" class="btn btn-primary mt-2">Go Home</a>
      </div>
    `;
  }
}

function showPasswordForm(slug) {
  const main = document.getElementById('galleryMain');
  main.innerHTML = `
    <div class="unlock-card">
      <i class="fas fa-lock"></i>
      <h2>Password Protected</h2>
      <p class="text-muted mb-2">Enter the gallery password to view photos.</p>
      <form id="unlockForm">
        <div class="form-group">
          <input type="password" id="galleryPassword" class="form-control" placeholder="Gallery password" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">
          <i class="fas fa-unlock"></i> Unlock Gallery
        </button>
      </form>
    </div>
  `;

  document.getElementById('unlockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('galleryPassword').value;
    try {
      const res = await api.unlockGallery(slug, password);
      currentGallery = res.data.gallery;
      main.innerHTML = `
        <div id="galleryHeader" class="gallery-header"></div>
        <div id="photoGrid" class="photo-grid"></div>
      `;
      renderGalleryHeader(currentGallery, false);
      await loadPhotos();
    } catch (err) {
      utils.showToast(err.message || 'Incorrect password', 'error');
    }
  });
}

function renderGalleryHeader(g, isOwner) {
  const header = document.getElementById('galleryHeader');
  if (!header) return;

  header.innerHTML = `
    <div class="flex-between" style="flex-wrap:wrap;gap:1rem">
      <div>
        <h1>${escapeHtml(g.name)}</h1>
        <div class="gallery-header-meta">
          ${g.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(g.location)}</span>` : ''}
          ${g.event_date ? `<span><i class="fas fa-calendar"></i> ${utils.formatDate(g.event_date)}</span>` : ''}
          <span><i class="fas fa-image"></i> ${g.photo_count || 0} photos</span>
          <span><i class="fas fa-eye"></i> ${g.views || 0} views</span>
        </div>
        ${g.description ? `<p class="text-muted" style="margin-top:0.5rem">${escapeHtml(g.description)}</p>` : ''}
      </div>
      <div class="gallery-actions">
        ${isOwner ? `
          <button class="btn btn-primary" onclick="document.getElementById('photoInput').click()">
            <i class="fas fa-cloud-upload-alt"></i> Upload
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="openShareModal()">
          <i class="fas fa-share-alt"></i> Share
        </button>
      </div>
    </div>
    ${isOwner ? `
      <div id="uploadZone" class="upload-zone mt-3">
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drop photos here</h3>
        <p>or click to browse · JPG, PNG, WebP · Max 15MB each</p>
        <input type="file" id="photoInput" accept="image/*" multiple hidden>
      </div>
      <div id="uploadProgress" class="upload-progress"></div>
    ` : ''}
  `;
}

async function loadPhotos() {
  if (!currentGallery) return;
  const grid = document.getElementById('photoGrid');
  if (!grid) return;

  try {
    const res = await api.getGalleryPhotos(currentGallery.id, 1, 100);
    photos = res.data.photos;

    if (photos.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-camera"></i>
          <h3>No photos yet</h3>
          <p>Upload some photos to get started.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = photos
      .map(
        (p, i) => `
      <div class="photo-item" onclick="openLightbox(${i})">
        <img src="${p.thumbnail_url || p.image_url}" alt="${escapeHtml(p.file_name)}" loading="lazy">
        <div class="photo-overlay">
          <div class="photo-actions">
            <button onclick="event.stopPropagation(); toggleFav('${p.id}', this)" class="${p.is_favorited ? 'favorited' : ''}" title="Favorite">
              <i class="fas fa-heart"></i>
            </button>
            <button onclick="event.stopPropagation(); downloadPhoto('${p.id}', '${p.image_url}')" title="Download">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (err) {
    utils.showToast('Failed to load photos', 'error');
  }
}

function openLightbox(index) {
  currentPhotoIndex = index;
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lb || !img || !photos[index]) return;

  img.src = photos[index].image_url;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function navLightbox(dir) {
  currentPhotoIndex = (currentPhotoIndex + dir + photos.length) % photos.length;
  document.getElementById('lightboxImg').src = photos[currentPhotoIndex].image_url;
}

async function toggleFav(photoId, btn) {
  if (!utils.isLoggedIn()) {
    utils.showToast('Please login to favorite photos', 'warning');
    return;
  }
  try {
    const res = await api.toggleFavorite(photoId);
    if (res.data.favorited) {
      btn.classList.add('favorited');
    } else {
      btn.classList.remove('favorited');
    }
  } catch (err) {
    utils.showToast(err.message, 'error');
  }
}

async function downloadPhoto(photoId, url) {
  try {
    await api.trackDownload(photoId);
  } catch {}
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.target = '_blank';
  a.click();
}

function openShareModal() {
  if (!currentGallery) return;
  const url = utils.getShareUrl(currentGallery.slug);
  document.getElementById('shareLinkInput').value = url;
  modal.open('shareModal');
}

async function copyShareLink() {
  const input = document.getElementById('shareLinkInput');
  try {
    await utils.copyToClipboard(input.value);
    utils.showToast('Link copied!', 'success');
    if (currentGallery) {
      try { await api.trackShare(currentGallery.id, 'copy'); } catch {}
    }
  } catch {
    utils.showToast('Could not copy', 'error');
  }
}

function shareWhatsApp() {
  const url = document.getElementById('shareLinkInput').value;
  const text = encodeURIComponent(`📸 ${currentGallery?.name || 'Event Photos'}\n\nView all photos:\n${url}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
  if (currentGallery) {
    try { api.trackShare(currentGallery.id, 'whatsapp'); } catch {}
  }
}

function shareNative() {
  const url = document.getElementById('shareLinkInput').value;
  if (navigator.share) {
    navigator.share({
      title: currentGallery?.name || 'CloudGalary',
      text: 'View our event photos',
      url,
    });
  } else {
    copyShareLink();
  }
}

// Keyboard navigation for lightbox
document.addEventListener('keydown', (e) => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'ArrowLeft') navLightbox(-1);
  if (e.key === 'ArrowRight') navLightbox(1);
  if (e.key === 'Escape') closeLightbox();
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

window.loadPhotos = loadPhotos;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navLightbox = navLightbox;
window.toggleFav = toggleFav;
window.downloadPhoto = downloadPhoto;
window.openShareModal = openShareModal;
window.copyShareLink = copyShareLink;
window.shareWhatsApp = shareWhatsApp;
window.shareNative = shareNative;
