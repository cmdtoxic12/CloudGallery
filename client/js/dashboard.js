document.addEventListener('DOMContentLoaded', async () => {
  if (!utils.requireAuth()) return;

  const user = utils.getUser();
  const welcomeEl = document.getElementById('welcomeName');
  if (welcomeEl && user) {
    welcomeEl.textContent = user.name?.split(' ')[0] || 'User';
  }

  // Load stats
  try {
    const statsRes = await api.getStats();
    const s = statsRes.data;
    document.getElementById('statGalleries').textContent = utils.formatNumber(s.totalGalleries);
    document.getElementById('statPhotos').textContent = utils.formatNumber(s.totalPhotos);
    document.getElementById('statViews').textContent = utils.formatNumber(s.totalViews);
    document.getElementById('statStorage').textContent = utils.formatBytes(s.storageUsed);
  } catch (err) {
    console.error('Stats error:', err);
  }

  // Load galleries
  const grid = document.getElementById('galleriesGrid');
  if (grid) {
    try {
      const res = await api.getGalleries();
      const galleries = res.data.galleries;

      if (galleries.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1">
            <i class="fas fa-images"></i>
            <h3>No galleries yet</h3>
            <p>Create your first event gallery to start uploading photos.</p>
            <a href="create-gallery.html" class="btn btn-primary mt-2">
              <i class="fas fa-plus"></i> Create Gallery
            </a>
          </div>
        `;
        return;
      }

      grid.innerHTML = galleries
        .map(
          (g) => `
        <div class="gallery-card" onclick="window.location.href='gallery.html?id=${g.id}'">
          <div class="gallery-card-cover">
            ${g.cover_photo_url
              ? `<img src="${g.cover_photo_url}" alt="${g.name}" loading="lazy">`
              : ''}
            <span class="visibility-badge">
              ${g.visibility === 'public' ? '🌍 Public' : g.visibility === 'private' ? '🔒 Private' : '🔑 Password'}
            </span>
          </div>
          <div class="gallery-card-body">
            <h3>${escapeHtml(g.name)}</h3>
            ${g.description ? `<p class="text-muted" style="font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(g.description)}</p>` : ''}
            <div class="gallery-meta">
              <span><i class="fas fa-image"></i> ${g.photo_count || 0}</span>
              <span><i class="fas fa-eye"></i> ${g.views || 0}</span>
              ${g.event_date ? `<span><i class="fas fa-calendar"></i> ${utils.formatDate(g.event_date)}</span>` : ''}
            </div>
          </div>
        </div>
      `
        )
        .join('');
    } catch (err) {
      utils.showToast('Failed to load galleries', 'error');
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Could not load galleries.</p></div>`;
    }
  }

  // Logout
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await api.logout();
      } catch {}
      utils.clearAuth();
      window.location.href = 'index.html';
    });
  });

  // Theme toggle
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => utils.toggleTheme());
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
