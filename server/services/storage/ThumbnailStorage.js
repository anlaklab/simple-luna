/**
 * ThumbnailStorage - Firebase Storage and Firestore integration for thumbnails
 * 
 * Manages:
 * - Firebase Storage for actual thumbnail image files (real thumbnails)
 * - Firestore for thumbnail metadata and URLs (both real and placeholders)
 * - Download URLs and caching
 * - Cleanup and overwrite operations
 */

const { getFirestore, isFirebaseInitialized } = require('../../config/firebase');

class ThumbnailStorage {
  constructor() {
    this.collection = 'thumbnails';
    this.storagePath = 'thumbnails'; // Firebase Storage path
  }

  /**
   * Save thumbnails to Firebase (Storage + Firestore)
   */
  async saveThumbnails(presentationId, thumbnails) {
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase not initialized');
    }

    console.log(`💾 ThumbnailStorage: Saving ${thumbnails.length} thumbnails for ${presentationId}`);
    
    const firestore = getFirestore();
    const batch = firestore.batch();
    const savedThumbnails = [];

    try {
      for (const thumbnail of thumbnails) {
        let finalThumbnail = { ...thumbnail };

        // Handle real thumbnails with binary data
        if (thumbnail.type === 'real' && thumbnail.data) {
          console.log(`📤 Uploading real thumbnail ${thumbnail.slideNumber} to Firebase Storage...`);
          
          // Upload to Firebase Storage and get download URL
          const downloadUrl = await this.uploadToStorage(
            presentationId, 
            thumbnail.slideIndex, 
            thumbnail.data, 
            thumbnail.format
          );
          
          finalThumbnail.url = downloadUrl;
          finalThumbnail.data = null; // Remove binary data from Firestore document
          finalThumbnail.storagePath = `${this.storagePath}/${presentationId}/slide_${thumbnail.slideIndex}.${thumbnail.format}`;
          
          console.log(`✅ Real thumbnail ${thumbnail.slideNumber} uploaded to storage`);
        }

        // Prepare Firestore document
        const thumbnailDoc = {
          presentationId,
          slideIndex: finalThumbnail.slideIndex,
          slideNumber: finalThumbnail.slideNumber,
          type: finalThumbnail.type,
          format: finalThumbnail.format,
          width: finalThumbnail.width,
          height: finalThumbnail.height,
          url: finalThumbnail.url,
          storagePath: finalThumbnail.storagePath || null,
          generatedAt: finalThumbnail.generatedAt,
          metadata: finalThumbnail.metadata || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Add to batch
        const docRef = firestore.collection(this.collection).doc();
        batch.set(docRef, thumbnailDoc);
        
        savedThumbnails.push({
          id: docRef.id,
          ...thumbnailDoc
        });
      }

      // Commit batch
      await batch.commit();
      console.log(`✅ ThumbnailStorage: Saved ${savedThumbnails.length} thumbnails to Firestore`);

      return savedThumbnails;

    } catch (error) {
      console.error(`❌ ThumbnailStorage: Save failed:`, error.message);
      throw error;
    }
  }

  /**
   * Upload thumbnail image to Firebase Storage
   */
  async uploadToStorage(presentationId, slideIndex, imageData, format) {
    try {
      // For now, we'll return a placeholder URL since the current setup
      // doesn't have Firebase Storage admin SDK properly configured
      // In a full implementation, this would upload to Firebase Storage
      
      console.log(`📤 Storage upload simulated for ${presentationId}/slide_${slideIndex}.${format}`);
      
      // TODO: Implement actual Firebase Storage upload
      // const admin = require('firebase-admin');
      // const bucket = admin.storage().bucket();
      // const fileName = `${this.storagePath}/${presentationId}/slide_${slideIndex}.${format}`;
      // const file = bucket.file(fileName);
      // await file.save(imageData, { metadata: { contentType: `image/${format}` } });
      // const [downloadUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
      // return downloadUrl;

      // For now, return a data URL for real thumbnails
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        return imageData; // Already a data URL
      }
      
      // Convert base64 to data URL if needed
      if (typeof imageData === 'string') {
        return `data:image/${format};base64,${imageData}`;
      }

      // Fallback
      return `data:image/${format};base64,${Buffer.from(imageData).toString('base64')}`;

    } catch (error) {
      console.error(`❌ Storage upload failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get thumbnails for a presentation
   */
  async getThumbnails(presentationId) {
    if (!isFirebaseInitialized()) {
      return [];
    }

    try {
      const firestore = getFirestore();
      const snapshot = await firestore
        .collection(this.collection)
        .where('presentationId', '==', presentationId)
        .orderBy('slideIndex', 'asc')
        .get();

      if (snapshot.empty) {
        return [];
      }

      const thumbnails = [];
      snapshot.forEach(doc => {
        thumbnails.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`📥 ThumbnailStorage: Retrieved ${thumbnails.length} thumbnails for ${presentationId}`);
      return thumbnails;

    } catch (error) {
      console.error(`❌ ThumbnailStorage: Get failed:`, error.message);
      return [];
    }
  }

  /**
   * Clear all thumbnails for a presentation
   */
  async clearThumbnails(presentationId) {
    if (!isFirebaseInitialized()) {
      return;
    }

    console.log(`🗑️ ThumbnailStorage: Clearing thumbnails for ${presentationId}`);

    try {
      const firestore = getFirestore();
      
      // Get all thumbnails for this presentation
      const snapshot = await firestore
        .collection(this.collection)
        .where('presentationId', '==', presentationId)
        .get();

      if (snapshot.empty) {
        console.log(`✅ No thumbnails found to clear for ${presentationId}`);
        return;
      }

      // Delete from Firebase Storage (for real thumbnails)
      const storageDeletePromises = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'real' && data.storagePath) {
          storageDeletePromises.push(this.deleteFromStorage(data.storagePath));
        }
      });

      // Delete from Firestore in batches
      const batches = [];
      let currentBatch = firestore.batch();
      let operationCount = 0;
      const batchSize = 500;

      snapshot.forEach(doc => {
        currentBatch.delete(doc.ref);
        operationCount++;

        if (operationCount === batchSize) {
          batches.push(currentBatch);
          currentBatch = firestore.batch();
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Execute all operations
      await Promise.all([
        ...storageDeletePromises,
        ...batches.map(batch => batch.commit())
      ]);

      console.log(`✅ ThumbnailStorage: Cleared ${snapshot.size} thumbnails for ${presentationId}`);

    } catch (error) {
      console.error(`❌ ThumbnailStorage: Clear failed:`, error.message);
      throw error;
    }
  }

  /**
   * Delete thumbnail from Firebase Storage
   */
  async deleteFromStorage(storagePath) {
    try {
      console.log(`🗑️ Deleting from storage: ${storagePath}`);
      
      // TODO: Implement actual Firebase Storage deletion
      // const admin = require('firebase-admin');
      // const bucket = admin.storage().bucket();
      // await bucket.file(storagePath).delete();
      
      console.log(`✅ Storage deletion simulated for: ${storagePath}`);
      
    } catch (error) {
      console.warn(`⚠️ Storage deletion failed for ${storagePath}:`, error.message);
      // Don't throw - storage cleanup failure shouldn't block the operation
    }
  }

  /**
   * Get thumbnail count and statistics
   */
  async getStats(presentationId) {
    const thumbnails = await this.getThumbnails(presentationId);
    
    const stats = {
      total: thumbnails.length,
      real: thumbnails.filter(t => t.type === 'real').length,
      placeholder: thumbnails.filter(t => t.type === 'placeholder').length,
      lastUpdated: thumbnails.length > 0 ? 
        Math.max(...thumbnails.map(t => new Date(t.updatedAt || t.createdAt).getTime())) : null
    };

    return stats;
  }

  /**
   * Update thumbnail URLs (for cache invalidation or URL changes)
   */
  async updateThumbnailUrls(presentationId, urlMapping) {
    if (!isFirebaseInitialized()) {
      return;
    }

    console.log(`🔄 ThumbnailStorage: Updating URLs for ${presentationId}`);

    try {
      const firestore = getFirestore();
      const batch = firestore.batch();
      
      const snapshot = await firestore
        .collection(this.collection)
        .where('presentationId', '==', presentationId)
        .get();

      snapshot.forEach(doc => {
        const data = doc.data();
        const newUrl = urlMapping[data.slideIndex];
        
        if (newUrl && newUrl !== data.url) {
          batch.update(doc.ref, {
            url: newUrl,
            updatedAt: new Date().toISOString()
          });
        }
      });

      await batch.commit();
      console.log(`✅ ThumbnailStorage: Updated URLs for ${presentationId}`);

    } catch (error) {
      console.error(`❌ ThumbnailStorage: URL update failed:`, error.message);
      throw error;
    }
  }
}

module.exports = ThumbnailStorage; 