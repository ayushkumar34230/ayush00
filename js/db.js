/**
 * ====================================================================
 * DATABASE SERVICE (Firebase Cloud Firestore + Local Fallback Sync)
 * ====================================================================
 */

class DatabaseService {
  constructor() {
    this.collectionName = "paintings";
    this.inquiriesCollection = "inquiries";
    this.listeners = [];
  }

  getDb() {
    if (window.GalleryFirebase && window.GalleryFirebase.isConfigured()) {
      return window.GalleryFirebase.getDb();
    }
    return null;
  }

  /**
   * Helper: Get local fallback store
   */
  getLocalStore() {
    const data = localStorage.getItem("my_art_gallery_local_paintings");
    if (!data) {
      const initial = window.INITIAL_ARTWORKS || [];
      localStorage.setItem("my_art_gallery_local_paintings", JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return window.INITIAL_ARTWORKS || [];
    }
  }

  saveLocalStore(items) {
    localStorage.setItem("my_art_gallery_local_paintings", JSON.stringify(items));
  }

  /**
   * Fetch all paintings (Public, no login required)
   */
  async getAllPaintings() {
    const db = this.getDb();
    if (db) {
      try {
        const snapshot = await db.collection(this.collectionName)
          .orderBy("createdAt", "desc")
          .get();

        if (snapshot.empty) {
          console.log("Firestore collection is empty. Checking if seed needed.");
          return [];
        }

        const paintings = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          paintings.push({
            id: doc.id,
            ...data,
            // Format dates
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
          });
        });
        return paintings;
      } catch (error) {
        console.error("Firestore fetch error, falling back to cached/sample:", error);
        return this.getLocalStore();
      }
    } else {
      return this.getLocalStore();
    }
  }

  /**
   * Seed initial sample data into Firestore if Firestore is fresh & empty
   */
  async seedInitialDataIfEmpty() {
    const db = this.getDb();
    if (!db) return;
    try {
      const snapshot = await db.collection(this.collectionName).limit(1).get();
      if (snapshot.empty && window.INITIAL_ARTWORKS) {
        console.log("Seeding initial artwork collection into Firestore...");
        const batch = db.batch();
        window.INITIAL_ARTWORKS.forEach(item => {
          const docRef = db.collection(this.collectionName).doc(item.id);
          const { id, ...data } = item;
          batch.set(docRef, {
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
        console.log("Initial artworks seeded successfully.");
      }
    } catch (err) {
      console.warn("Could not seed data into Firestore:", err);
    }
  }

  /**
   * Add a new painting
   */
  async addPainting(paintingData) {
    const db = this.getDb();
    const newDoc = {
      title: paintingData.title.trim(),
      artist: paintingData.artist.trim(),
      category: paintingData.category || "General",
      description: paintingData.description ? paintingData.description.trim() : "",
      medium: paintingData.medium ? paintingData.medium.trim() : "Mixed Media",
      dimensions: paintingData.dimensions ? paintingData.dimensions.trim() : "Custom",
      year: paintingData.year ? paintingData.year.toString().trim() : new Date().getFullYear().toString(),
      price: paintingData.price ? paintingData.price.trim() : "Inquire",
      status: paintingData.status || "Available",
      imageUrl: paintingData.imageUrl,
      storagePath: paintingData.storagePath || "",
      likes: 0,
      views: 1,
      featured: !!paintingData.featured,
      createdAt: (db && window.firebase) 
        ? firebase.firestore.FieldValue.serverTimestamp() 
        : new Date().toISOString()
    };

    if (db) {
      try {
        const docRef = await db.collection(this.collectionName).add(newDoc);
        return { id: docRef.id, ...newDoc };
      } catch (error) {
        console.error("Failed to add painting to Firestore:", error);
        throw error;
      }
    } else {
      // Local fallback
      const local = this.getLocalStore();
      const localItem = {
        id: "art-" + Date.now(),
        ...newDoc,
        createdAt: new Date().toISOString()
      };
      local.unshift(localItem);
      this.saveLocalStore(local);
      return localItem;
    }
  }

  /**
   * Update existing painting (Admin only)
   */
  async updatePainting(id, updateData) {
    const db = this.getDb();
    if (db) {
      try {
        const docRef = db.collection(this.collectionName).doc(id);
        const cleanUpdate = { ...updateData };
        delete cleanUpdate.id;
        cleanUpdate.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await docRef.update(cleanUpdate);
        return { success: true };
      } catch (error) {
        console.error("Failed to update painting in Firestore:", error);
        throw error;
      }
    } else {
      const local = this.getLocalStore();
      const index = local.findIndex(p => p.id === id);
      if (index !== -1) {
        local[index] = { ...local[index], ...updateData, updatedAt: new Date().toISOString() };
        this.saveLocalStore(local);
        return { success: true };
      }
      throw new Error("Painting not found.");
    }
  }

  /**
   * Delete painting permanently from Firestore
   */
  async deletePainting(id) {
    const db = this.getDb();
    if (db) {
      try {
        await db.collection(this.collectionName).doc(id).delete();
        return { success: true };
      } catch (error) {
        console.error("Failed to delete painting from Firestore:", error);
        throw error;
      }
    } else {
      let local = this.getLocalStore();
      local = local.filter(p => p.id !== id);
      this.saveLocalStore(local);
      return { success: true };
    }
  }

  /**
   * Like a painting (Public visitors can like)
   */
  async toggleLikePainting(id) {
    // Prevent duplicate spamming via localStorage session tracking
    const likedKey = `liked_${id}`;
    const alreadyLiked = localStorage.getItem(likedKey);

    const db = this.getDb();
    const delta = alreadyLiked ? -1 : 1;

    if (db && window.firebase) {
      try {
        const docRef = db.collection(this.collectionName).doc(id);
        await docRef.update({
          likes: firebase.firestore.FieldValue.increment(delta)
        });
        if (alreadyLiked) {
          localStorage.removeItem(likedKey);
        } else {
          localStorage.setItem(likedKey, "true");
        }
        return { liked: !alreadyLiked, delta };
      } catch (err) {
        console.error("Failed to update like in Firestore:", err);
      }
    }

    // Local fallback
    const local = this.getLocalStore();
    const item = local.find(p => p.id === id);
    if (item) {
      item.likes = Math.max(0, (item.likes || 0) + delta);
      this.saveLocalStore(local);
    }
    if (alreadyLiked) {
      localStorage.removeItem(likedKey);
    } else {
      localStorage.setItem(likedKey, "true");
    }
    return { liked: !alreadyLiked, delta };
  }

  isArtworkLikedByUser(id) {
    return !!localStorage.getItem(`liked_${id}`);
  }

  /**
   * Submit Contact Form Inquiry
   */
  async submitInquiry(inquiry) {
    const docData = {
      name: inquiry.name.trim(),
      email: inquiry.email.trim(),
      subject: inquiry.subject.trim(),
      message: inquiry.message.trim(),
      artworkId: inquiry.artworkId || null,
      submittedAt: (this.getDb() && window.firebase)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString()
    };

    const db = this.getDb();
    if (db) {
      try {
        await db.collection(this.inquiriesCollection).add(docData);
        return { success: true };
      } catch (error) {
        console.error("Error submitting inquiry to Firestore:", error);
        throw error;
      }
    } else {
      const existing = JSON.parse(localStorage.getItem("my_art_gallery_inquiries") || "[]");
      existing.unshift({ id: "inq-" + Date.now(), ...docData, submittedAt: new Date().toISOString() });
      localStorage.setItem("my_art_gallery_inquiries", JSON.stringify(existing));
      return { success: true };
    }
  }

  /**
   * Calculate statistics for Admin Dashboard
   */
  async getStats() {
    const paintings = await this.getAllPaintings();
    const totalPaintings = paintings.length;
    const totalLikes = paintings.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalViews = paintings.reduce((sum, p) => sum + (p.views || 0), 0);

    const categoriesMap = {};
    paintings.forEach(p => {
      const cat = p.category || "Uncategorized";
      categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
    });

    return {
      totalPaintings,
      totalLikes,
      totalViews,
      categoriesCount: Object.keys(categoriesMap).length,
      categoriesMap,
      recentPaintings: paintings.slice(0, 5)
    };
  }
}

window.dbService = new DatabaseService();
