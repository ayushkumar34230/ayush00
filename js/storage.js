/**
 * ====================================================================
 * STORAGE SERVICE (Firebase Cloud Storage & File Handling)
 * ====================================================================
 */

class StorageService {
  constructor() {
    this.allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];
    this.maxSizeBytes = 15 * 1024 * 1024; // 15MB
  }

  /**
   * Validate file format, extension, and file size
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: "Please select an image file to upload." };
    }

    // Verify MIME type
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const validExtension = /\.(jpg|jpeg|png|webp)$/i.test(fileName);

    if (!this.allowedTypes.includes(mimeType) && !validExtension) {
      return {
        valid: false,
        error: "Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image."
      };
    }

    if (file.size > this.maxSizeBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size is ${sizeMb}MB. Maximum permitted upload size is 15MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Generate an image preview and read dimensions
   */
  async getPreviewAndDimensions(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
            fileSizeFormatted: (file.size / (1024 * 1024) > 1) 
              ? (file.size / (1024 * 1024)).toFixed(2) + " MB"
              : Math.round(file.size / 1024) + " KB"
          });
        };
        img.onerror = () => {
          reject(new Error("Unable to decode image preview."));
        };
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error("Error reading file from disk."));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload image to Firebase Cloud Storage with progress updates
   * @param {File} file - The image file to upload
   * @param {Function} onProgress - Callback receiving upload percentage (0 - 100)
   * @returns {Promise<{downloadUrl: string, storagePath: string}>}
   */
  async uploadPaintingImage(file, onProgress = () => {}) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // If Firebase Cloud Storage is configured
    if (window.GalleryFirebase && window.GalleryFirebase.isConfigured()) {
      const storage = window.GalleryFirebase.getStorage();
      if (!storage) {
        throw new Error("Firebase Storage service is not ready.");
      }

      // Generate unique safe storage path
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `paintings/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeName}`;
      const storageRef = storage.ref(storagePath);

      const metadata = {
        contentType: file.type || "image/jpeg",
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name
        }
      };

      return new Promise((resolve, reject) => {
        const uploadTask = storageRef.put(file, metadata);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(percent);
          },
          (error) => {
            console.error("Storage upload failed:", error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
              onProgress(100);
              resolve({
                downloadUrl,
                storagePath
              });
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } else {
      // Offline / Demo fallback: converts to Data URL with simulated progress
      console.warn("Firebase not configured: saving image locally in browser storage.");
      return new Promise((resolve, reject) => {
        let percent = 0;
        const interval = setInterval(() => {
          percent += 20;
          if (percent > 100) percent = 100;
          onProgress(percent);
          if (percent >= 100) {
            clearInterval(interval);
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                downloadUrl: e.target.result,
                storagePath: `demo_local/${Date.now()}_${file.name}`
              });
            };
            reader.onerror = () => reject(new Error("Failed to convert image."));
            reader.readAsDataURL(file);
          }
        }, 120);
      });
    }
  }

  /**
   * Permanently delete an image from Firebase Cloud Storage
   */
  async deletePaintingImage(storagePath, downloadUrl) {
    if (window.GalleryFirebase && window.GalleryFirebase.isConfigured()) {
      const storage = window.GalleryFirebase.getStorage();
      if (!storage) return false;

      try {
        if (storagePath && !storagePath.startsWith("demo_local")) {
          const fileRef = storage.ref(storagePath);
          await fileRef.delete();
          return true;
        } else if (downloadUrl && downloadUrl.includes("firebasestorage.googleapis.com")) {
          const fileRef = storage.refFromURL(downloadUrl);
          await fileRef.delete();
          return true;
        }
      } catch (err) {
        console.warn("Storage deletion warning (file may already be removed):", err);
      }
    }
    return true;
  }
}

window.storageService = new StorageService();
