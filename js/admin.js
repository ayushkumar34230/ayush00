/**
 * ====================================================================
 * ADMIN DASHBOARD CONTROLLER
 * ====================================================================
 */

class AdminController {
  constructor() {
    this.paintings = [];
    this.currentEditId = null;
  }

  /**
   * Render the entire Admin Dashboard view
   */
  async renderDashboard() {
    const adminView = document.getElementById("admin-view");
    if (!adminView) return;

    // Check if user is logged in
    const isAdmin = window.authService.checkIsAdmin();
    const loginPrompt = document.getElementById("admin-login-required");
    const dashboardContent = document.getElementById("admin-dashboard-content");

    if (!isAdmin) {
      if (loginPrompt) loginPrompt.classList.remove("hidden");
      if (dashboardContent) dashboardContent.classList.add("hidden");
      return;
    }

    if (loginPrompt) loginPrompt.classList.add("hidden");
    if (dashboardContent) dashboardContent.classList.remove("hidden");

    // Fetch paintings and stats
    try {
      this.paintings = await window.dbService.getAllPaintings();
      const stats = await window.dbService.getStats();

      // Render statistics cards
      this.renderStats(stats);

      // Render paintings table
      this.renderPaintingsTable(this.paintings);

      // Render category breakdown
      this.renderCategoryBreakdown(stats.categoriesMap);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      window.app.showToast("Failed to load dashboard data", "error");
    }
  }

  renderStats(stats) {
    const elPaintings = document.getElementById("stat-total-paintings");
    const elLikes = document.getElementById("stat-total-likes");
    const elViews = document.getElementById("stat-total-views");
    const elCategories = document.getElementById("stat-total-categories");

    if (elPaintings) elPaintings.textContent = stats.totalPaintings;
    if (elLikes) elLikes.textContent = stats.totalLikes.toLocaleString();
    if (elViews) elViews.textContent = stats.totalViews.toLocaleString();
    if (elCategories) elCategories.textContent = stats.categoriesCount;
  }

  renderCategoryBreakdown(categoriesMap) {
    const container = document.getElementById("admin-category-breakdown");
    if (!container) return;

    if (!categoriesMap || Object.keys(categoriesMap).length === 0) {
      container.innerHTML = `<p class="text-muted">No artwork categories yet.</p>`;
      return;
    }

    const total = Object.values(categoriesMap).reduce((a, b) => a + b, 0);

    let html = `<div class="category-bars">`;
    for (const [cat, count] of Object.entries(categoriesMap)) {
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      html += `
        <div class="category-bar-item">
          <div class="category-bar-header">
            <span class="category-name">${cat}</span>
            <span class="category-count">${count} artwork${count !== 1 ? 's' : ''} (${percent}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    }
    html += `</div>`;
    container.innerHTML = html;
  }

  renderPaintingsTable(items) {
    const tbody = document.getElementById("admin-paintings-tbody");
    const countBadge = document.getElementById("admin-table-count");
    if (countBadge) countBadge.textContent = `${items.length} Artworks`;

    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5">
            <div class="empty-table-state">
              <i class="fa-regular fa-image empty-icon"></i>
              <p>No paintings found in the gallery.</p>
              <button class="btn btn-primary btn-sm" onclick="window.app.navigateTo('upload')">
                <i class="fa-solid fa-plus"></i> Upload First Painting
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map((painting, index) => {
      const dateStr = painting.createdAt 
        ? new Date(painting.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "N/A";
      
      const safeTitle = (painting.title || "Untitled").replace(/"/g, '&quot;');
      const safeArtist = (painting.artist || "Unknown").replace(/"/g, '&quot;');

      return `
        <tr data-id="${painting.id}">
          <td class="text-center font-mono text-muted">${index + 1}</td>
          <td>
            <div class="table-artwork-info">
              <div class="table-thumbnail-wrapper" onclick="window.app.openLightbox('${painting.id}')">
                <img src="${painting.imageUrl}" alt="${safeTitle}" class="table-thumbnail" onerror="this.src='https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=200&q=80'" />
                <span class="zoom-hint"><i class="fa-solid fa-magnifying-glass"></i></span>
              </div>
              <div class="artwork-text">
                <strong class="artwork-title-link" onclick="window.app.openLightbox('${painting.id}')">${painting.title}</strong>
                <span class="artwork-dims">${painting.dimensions || 'Dimensions unlisted'} • ${painting.year || 'Year unlisted'}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="artist-badge"><i class="fa-solid fa-user-pen"></i> ${painting.artist}</span>
          </td>
          <td>
            <span class="category-pill">${painting.category || 'General'}</span>
          </td>
          <td>
            <div class="stats-mini">
              <span><i class="fa-solid fa-heart text-danger"></i> ${painting.likes || 0}</span>
              <span><i class="fa-solid fa-eye text-info"></i> ${painting.views || 0}</span>
            </div>
          </td>
          <td class="text-muted text-sm">${dateStr}</td>
          <td class="text-right">
            <div class="admin-action-buttons">
              <button class="btn-icon btn-edit" title="Edit Painting Details" onclick="window.adminCtrl.openEditModal('${painting.id}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon btn-delete" title="Delete Painting Permanently" onclick="window.adminCtrl.confirmDelete('${painting.id}', '${safeTitle}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  filterAdminTable(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      this.renderPaintingsTable(this.paintings);
      return;
    }
    const filtered = this.paintings.filter(p => 
      (p.title && p.title.toLowerCase().includes(term)) ||
      (p.artist && p.artist.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
    this.renderPaintingsTable(filtered);
  }

  /**
   * Open Edit Painting Modal with preloaded data
   */
  openEditModal(id) {
    const painting = this.paintings.find(p => p.id === id);
    if (!painting) return;

    this.currentEditId = id;
    const modal = document.getElementById("edit-painting-modal");
    if (!modal) return;

    document.getElementById("edit-painting-id").value = painting.id;
    document.getElementById("edit-title").value = painting.title || "";
    document.getElementById("edit-artist").value = painting.artist || "";
    document.getElementById("edit-category").value = painting.category || "Oil";
    document.getElementById("edit-medium").value = painting.medium || "";
    document.getElementById("edit-dimensions").value = painting.dimensions || "";
    document.getElementById("edit-year").value = painting.year || "";
    document.getElementById("edit-price").value = painting.price || "";
    document.getElementById("edit-status").value = painting.status || "Available";
    document.getElementById("edit-description").value = painting.description || "";

    const preview = document.getElementById("edit-preview-img");
    if (preview) preview.src = painting.imageUrl;

    modal.classList.add("active");
  }

  closeEditModal() {
    const modal = document.getElementById("edit-painting-modal");
    if (modal) modal.classList.remove("active");
    this.currentEditId = null;
  }

  /**
   * Handle Edit Form Submission
   */
  async handleEditSubmit(e) {
    e.preventDefault();
    if (!this.currentEditId) return;

    const saveBtn = document.getElementById("btn-save-edit");
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {
      const updateData = {
        title: document.getElementById("edit-title").value,
        artist: document.getElementById("edit-artist").value,
        category: document.getElementById("edit-category").value,
        medium: document.getElementById("edit-medium").value,
        dimensions: document.getElementById("edit-dimensions").value,
        year: document.getElementById("edit-year").value,
        price: document.getElementById("edit-price").value,
        status: document.getElementById("edit-status").value,
        description: document.getElementById("edit-description").value
      };

      await window.dbService.updatePainting(this.currentEditId, updateData);
      window.app.showToast("Artwork details updated successfully!", "success");
      this.closeEditModal();
      await this.renderDashboard();
      // Also refresh public gallery in memory
      await window.app.loadGalleryItems();
    } catch (err) {
      console.error("Failed to update artwork:", err);
      window.app.showToast(`Error updating artwork: ${err.message}`, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  /**
   * Delete confirmation dialog
   */
  confirmDelete(id, title) {
    const painting = this.paintings.find(p => p.id === id);
    if (!painting) return;

    const modal = document.getElementById("confirm-delete-modal");
    if (!modal) return;

    document.getElementById("delete-painting-title").textContent = `"${title}"`;
    document.getElementById("btn-confirm-delete-action").onclick = () => this.executeDelete(painting);
    modal.classList.add("active");
  }

  closeDeleteModal() {
    const modal = document.getElementById("confirm-delete-modal");
    if (modal) modal.classList.remove("active");
  }

  /**
   * Execute permanent delete from Firestore & Storage
   */
  async executeDelete(painting) {
    const deleteBtn = document.getElementById("btn-confirm-delete-action");
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;

    try {
      // 1. Delete image from Firebase Cloud Storage
      if (painting.storagePath || painting.imageUrl) {
        await window.storageService.deletePaintingImage(painting.storagePath, painting.imageUrl);
      }

      // 2. Delete document from Firestore
      await window.dbService.deletePainting(painting.id);

      window.app.showToast("Artwork deleted permanently.", "info");
      this.closeDeleteModal();
      await this.renderDashboard();
      await window.app.loadGalleryItems();
    } catch (err) {
      console.error("Failed to delete artwork:", err);
      window.app.showToast(`Failed to delete artwork: ${err.message}`, "error");
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete Permanently`;
    }
  }
}

window.adminCtrl = new AdminController();
