/**
 * ====================================================================
 * MAIN APPLICATION LOGIC & ROUTER
 * ====================================================================
 */

class GalleryApp {
  constructor() {
    this.currentView = "home";
    this.paintings = [];
    this.activeFilter = "All";
    this.searchTerm = "";
    this.sortBy = "newest";
    this.selectedArtwork = null;
    this.lightboxZoomLevel = 1;
    this.selectedUploadFile = null;
  }

  async init() {
    console.log("🎨 Initializing My Art Gallery Application...");

    // Initialize Firebase
    window.GalleryFirebase.init();

    // Check Firebase configuration state
    this.updateFirebaseStatusBanner();

    // Subscribe to Auth changes
    window.authService.subscribe((authInfo) => {
      this.handleAuthStateChange(authInfo);
    });

    // Setup Event Listeners
    this.setupNavigation();
    this.setupGalleryFilters();
    this.setupUploadForm();
    this.setupContactForm();
    this.setupModals();
    this.setupConfigWizard();

    // Load initial gallery data
    await this.loadGalleryItems();

    // Check URL hash for routing (e.g. #gallery, #upload, #admin)
    this.handleRouteFromHash();
    window.addEventListener("hashchange", () => this.handleRouteFromHash());

    // Hide loader
    const preloader = document.getElementById("preloader");
    if (preloader) {
      preloader.classList.add("fade-out");
      setTimeout(() => preloader.style.display = "none", 400);
    }
  }

  updateFirebaseStatusBanner() {
    const banner = document.getElementById("firebase-status-banner");
    if (!banner) return;

    if (window.GalleryFirebase.isConfigured()) {
      banner.classList.add("hidden");
    } else {
      banner.classList.remove("hidden");
    }
  }

  handleAuthStateChange({ user, isAdmin }) {
    const authLinks = document.querySelectorAll(".nav-auth-state");
    const adminBadges = document.querySelectorAll(".admin-only-badge");
    const loginBtn = document.getElementById("nav-login-btn");
    const userMenu = document.getElementById("nav-user-menu");
    const userEmailSpan = document.getElementById("nav-user-email");

    if (isAdmin && user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (userMenu) userMenu.classList.remove("hidden");
      if (userEmailSpan) userEmailSpan.textContent = user.email || "Admin";
      adminBadges.forEach(el => el.classList.remove("hidden"));
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (userMenu) userMenu.classList.add("hidden");
      adminBadges.forEach(el => el.classList.add("hidden"));
    }

    // If currently on admin page, update view
    if (this.currentView === "admin") {
      window.adminCtrl.renderDashboard();
    }
  }

  setupNavigation() {
    // Nav links
    document.querySelectorAll("[data-nav-target]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.getAttribute("data-nav-target");
        this.navigateTo(target);
      });
    });

    // Mobile Hamburger
    const menuBtn = document.getElementById("mobile-menu-toggle");
    const navMenu = document.getElementById("navbar-links");
    if (menuBtn && navMenu) {
      menuBtn.addEventListener("click", () => {
        navMenu.classList.toggle("open");
        menuBtn.classList.toggle("active");
      });

      // Close menu when clicked link
      navMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          navMenu.classList.remove("open");
          menuBtn.classList.remove("active");
        });
      });
    }

    // Scroll navbar background change
    window.addEventListener("scroll", () => {
      const navbar = document.querySelector(".navbar");
      if (navbar) {
        if (window.scrollY > 40) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
      }
    });
  }

  handleRouteFromHash() {
    const hash = window.location.hash.replace("#", "") || "home";
    this.navigateTo(hash, false);
  }

  navigateTo(viewId, updateHash = true) {
    const validViews = ["home", "gallery", "upload", "about", "contact", "admin"];
    if (!validViews.includes(viewId)) {
      viewId = "home";
    }

    this.currentView = viewId;
    if (updateHash) {
      window.location.hash = viewId;
    }

    // Switch view containers
    document.querySelectorAll(".page-view").forEach(el => {
      el.classList.remove("active");
    });

    const targetEl = document.getElementById(`view-${viewId}`);
    if (targetEl) {
      targetEl.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Update active nav links
    document.querySelectorAll("[data-nav-target]").forEach(link => {
      if (link.getAttribute("data-nav-target") === viewId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // View-specific actions
    if (viewId === "admin") {
      window.adminCtrl.renderDashboard();
    } else if (viewId === "gallery") {
      this.renderGalleryGrid();
    }
  }

  /**
   * Load gallery data from DB
   */
  async loadGalleryItems() {
    try {
      this.paintings = await window.dbService.getAllPaintings();
      // If Firestore is connected and empty, seed it
      if (this.paintings.length === 0 && window.GalleryFirebase.isConfigured()) {
        await window.dbService.seedInitialDataIfEmpty();
        this.paintings = await window.dbService.getAllPaintings();
      }
      this.renderFeaturedHome();
      this.renderGalleryGrid();
    } catch (err) {
      console.error("Failed to load paintings:", err);
      this.showToast("Could not load gallery artworks", "error");
    }
  }

  /**
   * Render featured artworks on Homepage
   */
  renderFeaturedHome() {
    const container = document.getElementById("home-featured-grid");
    if (!container) return;

    const featured = this.paintings.slice(0, 3);
    if (featured.length === 0) {
      container.innerHTML = `<p class="text-center text-muted">Featured artworks will appear here.</p>`;
      return;
    }

    container.innerHTML = featured.map(art => `
      <div class="art-card" onclick="window.app.openLightbox('${art.id}')">
        <div class="art-image-wrapper">
          <img src="${art.imageUrl}" alt="${art.title}" loading="lazy" class="art-img" onerror="this.src='https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80'" />
          <div class="art-badge">${art.category || 'Painting'}</div>
          <div class="art-overlay">
            <span class="view-btn"><i class="fa-solid fa-expand"></i> View Artwork</span>
          </div>
        </div>
        <div class="art-details">
          <div class="art-meta-row">
            <h3 class="art-title">${art.title}</h3>
            <button class="like-btn ${window.dbService.isArtworkLikedByUser(art.id) ? 'liked' : ''}" onclick="event.stopPropagation(); window.app.handleLike('${art.id}', this)">
              <i class="fa-heart ${window.dbService.isArtworkLikedByUser(art.id) ? 'fa-solid' : 'fa-regular'}"></i>
              <span class="like-count">${art.likes || 0}</span>
            </button>
          </div>
          <p class="art-artist">by <strong>${art.artist}</strong></p>
          <div class="art-footer-info">
            <span class="art-medium">${art.medium || 'Original Work'}</span>
            <span class="art-year">${art.year || ''}</span>
          </div>
        </div>
      </div>
    `).join("");
  }

  /**
   * Render main public gallery grid
   */
  renderGalleryGrid() {
    const grid = document.getElementById("gallery-grid");
    const countDisplay = document.getElementById("gallery-results-count");
    if (!grid) return;

    let items = [...this.paintings];

    // Filter by Category
    if (this.activeFilter !== "All") {
      items = items.filter(p => (p.category || "").toLowerCase() === this.activeFilter.toLowerCase());
    }

    // Filter by Search Query
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      items = items.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.artist && p.artist.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.medium && p.medium.toLowerCase().includes(q))
      );
    }

    // Sort items
    if (this.sortBy === "newest") {
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (this.sortBy === "likes") {
      items.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (this.sortBy === "title") {
      items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    // Update count display
    if (countDisplay) {
      countDisplay.textContent = `Showing ${items.length} artwork${items.length !== 1 ? 's' : ''}`;
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="gallery-empty-state">
          <i class="fa-solid fa-paintbrush"></i>
          <h3>No Artworks Found</h3>
          <p>No paintings matched your current filter criteria. Try clearing search or selecting a different category.</p>
          <button class="btn btn-outline" onclick="window.app.resetFilters()">Reset Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(art => {
      const isLiked = window.dbService.isArtworkLikedByUser(art.id);
      return `
        <div class="art-card" onclick="window.app.openLightbox('${art.id}')">
          <div class="art-image-wrapper">
            <img src="${art.imageUrl}" alt="${art.title}" loading="lazy" class="art-img" onerror="this.src='https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80'" />
            <div class="art-badge">${art.category || 'Painting'}</div>
            <div class="art-overlay">
              <span class="view-btn"><i class="fa-solid fa-expand"></i> Inspect Painting</span>
            </div>
          </div>
          <div class="art-details">
            <div class="art-meta-row">
              <h3 class="art-title">${art.title}</h3>
              <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); window.app.handleLike('${art.id}', this)" title="Appreciate artwork">
                <i class="fa-heart ${isLiked ? 'fa-solid' : 'fa-regular'}"></i>
                <span class="like-count">${art.likes || 0}</span>
              </button>
            </div>
            <p class="art-artist">by <strong>${art.artist}</strong></p>
            <p class="art-snippet">${art.description ? (art.description.length > 85 ? art.description.slice(0, 85) + '...' : art.description) : ''}</p>
            <div class="art-footer-info">
              <span class="art-medium"><i class="fa-solid fa-palette"></i> ${art.medium || 'Custom'}</span>
              <span class="art-dims"><i class="fa-solid fa-ruler-combined"></i> ${art.dimensions || ''}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  setupGalleryFilters() {
    // Category pills
    const filterContainer = document.getElementById("gallery-category-filters");
    if (filterContainer) {
      filterContainer.querySelectorAll(".filter-pill").forEach(btn => {
        btn.addEventListener("click", () => {
          filterContainer.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.activeFilter = btn.getAttribute("data-category") || "All";
          this.renderGalleryGrid();
        });
      });
    }

    // Live search input
    const searchInput = document.getElementById("gallery-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        this.renderGalleryGrid();
      });
    }

    // Sort select
    const sortSelect = document.getElementById("gallery-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.renderGalleryGrid();
      });
    }
  }

  resetFilters() {
    this.activeFilter = "All";
    this.searchTerm = "";
    this.sortBy = "newest";

    const searchInput = document.getElementById("gallery-search-input");
    if (searchInput) searchInput.value = "";

    const sortSelect = document.getElementById("gallery-sort-select");
    if (sortSelect) sortSelect.value = "newest";

    const filterContainer = document.getElementById("gallery-category-filters");
    if (filterContainer) {
      filterContainer.querySelectorAll(".filter-pill").forEach(b => {
        if (b.getAttribute("data-category") === "All") b.classList.add("active");
        else b.classList.remove("active");
      });
    }

    this.renderGalleryGrid();
  }

  async handleLike(id, buttonEl) {
    try {
      const result = await window.dbService.toggleLikePainting(id);
      const icon = buttonEl.querySelector("i");
      const countEl = buttonEl.querySelector(".like-count");

      if (result.liked) {
        buttonEl.classList.add("liked");
        icon.classList.remove("fa-regular");
        icon.classList.add("fa-solid");
      } else {
        buttonEl.classList.remove("liked");
        icon.classList.remove("fa-solid");
        icon.classList.add("fa-regular");
      }

      // Update in-memory count
      const art = this.paintings.find(p => p.id === id);
      if (art) {
        art.likes = Math.max(0, (art.likes || 0) + result.delta);
        if (countEl) countEl.textContent = art.likes;
      }

      // If Lightbox is open on this artwork, update its like button too
      const modalLike = document.getElementById("lightbox-like-btn");
      if (modalLike && this.selectedArtwork && this.selectedArtwork.id === id) {
        modalLike.querySelector(".like-count").textContent = art.likes;
        if (result.liked) {
          modalLike.classList.add("liked");
          modalLike.querySelector("i").className = "fa-solid fa-heart";
        } else {
          modalLike.classList.remove("liked");
          modalLike.querySelector("i").className = "fa-regular fa-heart";
        }
      }
    } catch (err) {
      console.error("Like action failed:", err);
    }
  }

  /**
   * LIGHTBOX / FULL-SIZE PAINTING VIEWER
   */
  openLightbox(id) {
    const art = this.paintings.find(p => p.id === id);
    if (!art) return;

    this.selectedArtwork = art;
    this.lightboxZoomLevel = 1;

    const modal = document.getElementById("lightbox-modal");
    if (!modal) return;

    document.getElementById("lightbox-img").src = art.imageUrl;
    document.getElementById("lightbox-img").style.transform = "scale(1)";
    document.getElementById("lightbox-title").textContent = art.title;
    document.getElementById("lightbox-artist").textContent = art.artist;
    document.getElementById("lightbox-category").textContent = art.category || "Original Work";
    document.getElementById("lightbox-medium").textContent = art.medium || "Not specified";
    document.getElementById("lightbox-dimensions").textContent = art.dimensions || "Not specified";
    document.getElementById("lightbox-year").textContent = art.year || "Contemporary";
    document.getElementById("lightbox-description").textContent = art.description || "No description provided.";
    document.getElementById("lightbox-price").textContent = art.price || "Price on Request";
    document.getElementById("lightbox-status").textContent = art.status || "Available";

    // Like button state
    const isLiked = window.dbService.isArtworkLikedByUser(art.id);
    const likeBtn = document.getElementById("lightbox-like-btn");
    if (likeBtn) {
      likeBtn.className = `btn btn-outline ${isLiked ? 'liked' : ''}`;
      likeBtn.querySelector("i").className = isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";
      likeBtn.querySelector(".like-count").textContent = art.likes || 0;
      likeBtn.onclick = () => this.handleLike(art.id, likeBtn);
    }

    // Share button
    const shareBtn = document.getElementById("lightbox-share-btn");
    if (shareBtn) {
      shareBtn.onclick = () => this.shareArtwork(art);
    }

    // Inquire button
    const inquireBtn = document.getElementById("lightbox-inquire-btn");
    if (inquireBtn) {
      inquireBtn.onclick = () => {
        this.closeLightbox();
        this.navigateTo("contact");
        const subj = document.getElementById("contact-subject");
        if (subj) subj.value = `Inquiry regarding "${art.title}" (${art.category || 'Artwork'})`;
      };
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeLightbox() {
    const modal = document.getElementById("lightbox-modal");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
    this.selectedArtwork = null;
    this.lightboxZoomLevel = 1;
  }

  zoomLightbox(delta) {
    this.lightboxZoomLevel += delta;
    if (this.lightboxZoomLevel < 0.8) this.lightboxZoomLevel = 0.8;
    if (this.lightboxZoomLevel > 3.0) this.lightboxZoomLevel = 3.0;

    const img = document.getElementById("lightbox-img");
    if (img) {
      img.style.transform = `scale(${this.lightboxZoomLevel})`;
    }
  }

  resetLightboxZoom() {
    this.lightboxZoomLevel = 1;
    const img = document.getElementById("lightbox-img");
    if (img) img.style.transform = "scale(1)";
  }

  shareArtwork(art) {
    if (navigator.share) {
      navigator.share({
        title: `${art.title} by ${art.artist}`,
        text: `View this artwork at My Art Gallery: ${art.title}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      this.showToast("Gallery link copied to clipboard!", "success");
    }
  }

  /**
   * UPLOAD PAINTING LOGIC
   */
  setupUploadForm() {
    const dropZone = document.getElementById("upload-dropzone");
    const fileInput = document.getElementById("upload-file-input");
    const previewWrapper = document.getElementById("upload-preview-wrapper");
    const previewImg = document.getElementById("upload-preview-img");
    const clearBtn = document.getElementById("btn-clear-preview");
    const form = document.getElementById("painting-upload-form");

    if (!dropZone || !fileInput) return;

    // Click to select file
    dropZone.addEventListener("click", () => fileInput.click());

    // Drag & Drop events
    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearUploadFile();
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => this.handleUploadSubmit(e));
    }
  }

  async handleFileSelected(file) {
    const validation = window.storageService.validateFile(file);
    if (!validation.valid) {
      this.showToast(validation.error, "error");
      return;
    }

    this.selectedUploadFile = file;

    try {
      const details = await window.storageService.getPreviewAndDimensions(file);
      const previewWrapper = document.getElementById("upload-preview-wrapper");
      const dropContent = document.getElementById("upload-drop-content");
      const previewImg = document.getElementById("upload-preview-img");
      const fileInfo = document.getElementById("upload-file-info");

      if (previewImg) previewImg.src = details.dataUrl;
      if (fileInfo) {
        fileInfo.innerHTML = `
          <span><strong>File:</strong> ${file.name}</span> • 
          <span><strong>Dimensions:</strong> ${details.width} × ${details.height}px</span> • 
          <span><strong>Size:</strong> ${details.fileSizeFormatted}</span>
        `;
      }

      if (dropContent) dropContent.classList.add("hidden");
      if (previewWrapper) previewWrapper.classList.remove("hidden");
    } catch (err) {
      this.showToast("Could not preview image: " + err.message, "error");
    }
  }

  clearUploadFile() {
    this.selectedUploadFile = null;
    const fileInput = document.getElementById("upload-file-input");
    if (fileInput) fileInput.value = "";

    const previewWrapper = document.getElementById("upload-preview-wrapper");
    const dropContent = document.getElementById("upload-drop-content");
    const previewImg = document.getElementById("upload-preview-img");

    if (previewImg) previewImg.src = "";
    if (previewWrapper) previewWrapper.classList.add("hidden");
    if (dropContent) dropContent.classList.remove("hidden");
  }

  async handleUploadSubmit(e) {
    e.preventDefault();

    if (!this.selectedUploadFile) {
      this.showToast("Please select an image file to upload.", "warning");
      return;
    }

    const title = document.getElementById("upload-title").value.trim();
    const artist = document.getElementById("upload-artist").value.trim();
    const category = document.getElementById("upload-category").value;
    const medium = document.getElementById("upload-medium").value.trim();
    const dimensions = document.getElementById("upload-dimensions").value.trim();
    const year = document.getElementById("upload-year").value.trim();
    const price = document.getElementById("upload-price").value.trim();
    const description = document.getElementById("upload-description").value.trim();

    if (!title || !artist) {
      this.showToast("Please provide both painting title and artist name.", "warning");
      return;
    }

    // Show Progress Bar
    const progressContainer = document.getElementById("upload-progress-container");
    const progressBar = document.getElementById("upload-progress-bar");
    const progressPercent = document.getElementById("upload-progress-percent");
    const submitBtn = document.getElementById("btn-submit-upload");

    if (progressContainer) progressContainer.classList.remove("hidden");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading Painting...`;
    }

    try {
      // 1. Upload to Firebase Storage
      const storageResult = await window.storageService.uploadPaintingImage(
        this.selectedUploadFile,
        (percent) => {
          if (progressBar) progressBar.style.width = `${percent}%`;
          if (progressPercent) progressPercent.textContent = `${percent}%`;
        }
      );

      // 2. Add record to Firestore Database
      const newPaintingData = {
        title,
        artist,
        category,
        medium,
        dimensions,
        year: year || new Date().getFullYear().toString(),
        price,
        description,
        imageUrl: storageResult.downloadUrl,
        storagePath: storageResult.storagePath,
        featured: false
      };

      const added = await window.dbService.addPainting(newPaintingData);

      // 3. Success Feedback
      this.showToast("Painting uploaded successfully to the gallery!", "success");

      // Reset form
      document.getElementById("painting-upload-form").reset();
      this.clearUploadFile();

      // Refresh gallery items
      await this.loadGalleryItems();

      // Navigate to gallery to view new artwork
      setTimeout(() => {
        this.navigateTo("gallery");
      }, 1000);

    } catch (error) {
      console.error("Upload error:", error);
      this.showToast(`Upload failed: ${error.message}`, "error");
    } finally {
      if (progressContainer) progressContainer.classList.add("hidden");
      if (progressBar) progressBar.style.width = "0%";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload Painting to Gallery`;
      }
    }
  }

  /**
   * CONTACT FORM LOGIC
   */
  setupContactForm() {
    const form = document.getElementById("contact-inquiry-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector("button[type='submit']");
      const originalText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending Inquiry...`;

      try {
        const inquiryData = {
          name: document.getElementById("contact-name").value,
          email: document.getElementById("contact-email").value,
          subject: document.getElementById("contact-subject").value,
          message: document.getElementById("contact-message").value
        };

        await window.dbService.submitInquiry(inquiryData);
        this.showToast("Your inquiry has been sent to the artist. Thank you!", "success");
        form.reset();
      } catch (err) {
        console.error("Inquiry error:", err);
        this.showToast("Failed to submit inquiry: " + err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  /**
   * MODALS & POPUPS
   */
  setupModals() {
    // Lightbox Controls
    const closeLightboxBtn = document.getElementById("lightbox-close-btn");
    if (closeLightboxBtn) closeLightboxBtn.addEventListener("click", () => this.closeLightbox());

    const zoomInBtn = document.getElementById("lightbox-zoom-in");
    if (zoomInBtn) zoomInBtn.addEventListener("click", () => this.zoomLightbox(0.25));

    const zoomOutBtn = document.getElementById("lightbox-zoom-out");
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => this.zoomLightbox(-0.25));

    const zoomResetBtn = document.getElementById("lightbox-zoom-reset");
    if (zoomResetBtn) zoomResetBtn.addEventListener("click", () => this.resetLightboxZoom());

    // Login Modal
    const openLoginBtn = document.getElementById("nav-login-btn");
    const loginModal = document.getElementById("login-modal");
    const closeLoginBtn = document.getElementById("login-modal-close");
    const loginForm = document.getElementById("admin-login-form");

    if (openLoginBtn && loginModal) {
      openLoginBtn.addEventListener("click", () => loginModal.classList.add("active"));
    }
    if (closeLoginBtn && loginModal) {
      closeLoginBtn.addEventListener("click", () => loginModal.classList.remove("active"));
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const pass = document.getElementById("login-password").value;
        const btn = document.getElementById("btn-login-submit");

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

        const result = await window.authService.login(email, pass);
        btn.disabled = false;
        btn.innerHTML = `Sign In as Admin`;

        if (result.success) {
          loginModal.classList.remove("active");
          loginForm.reset();
          this.showToast("Welcome Admin! You now have full management privileges.", "success");
          this.navigateTo("admin");
        } else {
          this.showToast(result.error, "error");
        }
      });
    }

    // Logout
    const logoutBtn = document.getElementById("nav-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await window.authService.logout();
        this.showToast("Logged out successfully.", "info");
        this.navigateTo("home");
      });
    }

    // Edit Modal close & submit
    const closeEditBtn = document.getElementById("edit-modal-close");
    const cancelEditBtn = document.getElementById("btn-cancel-edit");
    const editForm = document.getElementById("edit-painting-form");

    if (closeEditBtn) closeEditBtn.addEventListener("click", () => window.adminCtrl.closeEditModal());
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => window.adminCtrl.closeEditModal());
    if (editForm) editForm.addEventListener("submit", (e) => window.adminCtrl.handleEditSubmit(e));

    // Delete Modal close
    const cancelDeleteBtn = document.getElementById("btn-cancel-delete");
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", () => window.adminCtrl.closeDeleteModal());

    // Close modals on ESC or clicking outside
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeLightbox();
        if (loginModal) loginModal.classList.remove("active");
        window.adminCtrl.closeEditModal();
        window.adminCtrl.closeDeleteModal();
        const configModal = document.getElementById("config-wizard-modal");
        if (configModal) configModal.classList.remove("active");
      }
    });

    document.querySelectorAll(".modal-backdrop").forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("active");
          document.body.style.overflow = "";
        }
      });
    });
  }

  /**
   * FIREBASE CONFIGURATION SETUP WIZARD
   */
  setupConfigWizard() {
    const bannerBtn = document.getElementById("btn-open-config-wizard");
    const modal = document.getElementById("config-wizard-modal");
    const closeBtn = document.getElementById("config-modal-close");
    const form = document.getElementById("firebase-config-form");
    const resetBtn = document.getElementById("btn-reset-config");

    if (bannerBtn && modal) {
      bannerBtn.addEventListener("click", () => {
        const current = window.GalleryFirebase.getConfig();
        document.getElementById("cfg-api-key").value = current.apiKey.includes("YOUR_") ? "" : current.apiKey;
        document.getElementById("cfg-auth-domain").value = current.authDomain.includes("YOUR_") ? "" : current.authDomain;
        document.getElementById("cfg-project-id").value = current.projectId.includes("YOUR_") ? "" : current.projectId;
        document.getElementById("cfg-storage-bucket").value = current.storageBucket.includes("YOUR_") ? "" : current.storageBucket;
        document.getElementById("cfg-sender-id").value = current.messagingSenderId.includes("YOUR_") ? "" : current.messagingSenderId;
        document.getElementById("cfg-app-id").value = current.appId.includes("YOUR_") ? "" : current.appId;
        modal.classList.add("active");
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const newCfg = {
          apiKey: document.getElementById("cfg-api-key").value.trim(),
          authDomain: document.getElementById("cfg-auth-domain").value.trim(),
          projectId: document.getElementById("cfg-project-id").value.trim(),
          storageBucket: document.getElementById("cfg-storage-bucket").value.trim(),
          messagingSenderId: document.getElementById("cfg-sender-id").value.trim(),
          appId: document.getElementById("cfg-app-id").value.trim()
        };

        if (!newCfg.apiKey || !newCfg.projectId) {
          this.showToast("Please provide at least your API Key and Project ID.", "warning");
          return;
        }

        window.GalleryFirebase.saveConfig(newCfg);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("Reset to default configuration?")) {
          window.GalleryFirebase.resetConfig();
        }
      });
    }
  }

  /**
   * TOAST NOTIFICATION SYSTEM
   */
  showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-circle-exclamation";
    if (type === "warning") icon = "fa-triangle-exclamation";

    toast.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}

// Instantiate and start on DOM load
window.app = new GalleryApp();
document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
