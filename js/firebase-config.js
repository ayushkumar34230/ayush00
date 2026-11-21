/**
 * ====================================================================
 * MY ART GALLERY - FIREBASE CONFIGURATION
 * ====================================================================
 * To connect your own live Firebase backend:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or select an existing one).
 * 3. Enable Authentication (Email/Password).
 * 4. Enable Cloud Firestore Database (in test mode or production with rules).
 * 5. Enable Cloud Storage for Firebase.
 * 6. Register a Web App in Project Settings and copy your config values below.
 * ====================================================================
 */

// Replace the placeholder values with your Firebase Project credentials:
const defaultFirebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if user has saved credentials via the in-app setup modal
function getActiveFirebaseConfig() {
  const localSaved = localStorage.getItem("my_art_gallery_firebase_config");
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed && parsed.apiKey && !parsed.apiKey.includes("YOUR_")) {
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse saved Firebase config from localStorage", e);
    }
  }
  return defaultFirebaseConfig;
}

// Global Firebase service instances
let firebaseApp = null;
let authInstance = null;
let dbInstance = null;
let storageInstance = null;
let isConfigured = false;

function initFirebase() {
  const config = getActiveFirebaseConfig();
  
  // Validate if placeholders have been replaced
  if (
    config.apiKey &&
    !config.apiKey.includes("YOUR_") &&
    config.projectId &&
    !config.projectId.includes("YOUR_")
  ) {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config);
      } else {
        firebaseApp = firebase.app();
      }
      authInstance = firebase.auth();
      dbInstance = firebase.firestore();
      storageInstance = firebase.storage();
      isConfigured = true;
      console.log("✅ Firebase initialized successfully with project:", config.projectId);
      return true;
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      isConfigured = false;
      return false;
    }
  } else {
    console.info("ℹ️ Firebase credentials not yet configured. Cloud features and administrator sign-in are unavailable.");
    isConfigured = false;
    return false;
  }
}

// Save config from UI Setup Wizard
function saveFirebaseConfig(newConfig) {
  try {
    localStorage.setItem("my_art_gallery_firebase_config", JSON.stringify(newConfig));
    location.reload();
  } catch (err) {
    console.error("Error saving Firebase config", err);
    throw err;
  }
}

// Reset config back to default
function resetFirebaseConfig() {
  localStorage.removeItem("my_art_gallery_firebase_config");
  location.reload();
}

window.GalleryFirebase = {
  getApp: () => firebaseApp,
  getAuth: () => authInstance,
  getDb: () => dbInstance,
  getStorage: () => storageInstance,
  isConfigured: () => isConfigured,
  getConfig: getActiveFirebaseConfig,
  saveConfig: saveFirebaseConfig,
  resetConfig: resetFirebaseConfig,
  init: initFirebase
};
