/**
 * ====================================================================
 * AUTHENTICATION SERVICE (Firebase Auth + Admin Session Guard)
 * ====================================================================
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAdmin = false;
    this.listeners = [];
    this.init();
  }

  init() {
    // Check if Firebase is available
    if (window.GalleryFirebase && window.GalleryFirebase.isConfigured()) {
      const auth = window.GalleryFirebase.getAuth();
      if (auth) {
        auth.onAuthStateChanged((user) => {
          this.currentUser = user;
          this.isAdmin = !!user;
          this.notifyListeners();
        });
        return;
      }
    }

    sessionStorage.removeItem("demo_admin_authenticated");
    this.currentUser = null;
    this.isAdmin = false;
    this.notifyListeners();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback({ user: this.currentUser, isAdmin: this.isAdmin });
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb({ user: this.currentUser, isAdmin: this.isAdmin }));
  }

  /**
   * Log in using Firebase Authentication
   */
  async login(email, password) {
    email = email.trim();
    
    if (!window.GalleryFirebase || !window.GalleryFirebase.isConfigured()) {
      return { success: false, error: "Please connect Firebase in settings before signing in." };
    }

    const auth = window.GalleryFirebase.getAuth();
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      this.currentUser = userCredential.user;
      this.isAdmin = true;
      this.notifyListeners();
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error("Firebase Login Error:", error);
      // Provide friendly error message
      let msg = error.message;
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = "Invalid email or password. Please verify your credentials.";
      } else if (error.code === 'auth/invalid-email') {
        msg = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        msg = "Access temporarily disabled due to many failed attempts. Try again later.";
      }
      return { success: false, error: msg };
    }
  }

  /**
   * Create an admin user in Firebase (convenient helper for first-time project owner)
   */
  async createAdminAccount(email, password) {
    if (window.GalleryFirebase && window.GalleryFirebase.isConfigured()) {
      const auth = window.GalleryFirebase.getAuth();
      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        this.currentUser = userCredential.user;
        this.isAdmin = true;
        this.notifyListeners();
        return { success: true, user: this.currentUser };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: "Please configure Firebase first to register an account." };
    }
  }

  /**
   * Sign out
   */
  async logout() {
    if (window.GalleryFirebase && window.GalleryFirebase.isConfigured()) {
      const auth = window.GalleryFirebase.getAuth();
      if (auth) {
        try {
          await auth.signOut();
        } catch (err) {
          console.error("Signout error:", err);
        }
      }
    }
    sessionStorage.removeItem("demo_admin_authenticated");
    this.currentUser = null;
    this.isAdmin = false;
    this.notifyListeners();
    return { success: true };
  }

  getUser() {
    return this.currentUser;
  }

  checkIsAdmin() {
    return this.isAdmin;
  }
}

window.authService = new AuthService();
