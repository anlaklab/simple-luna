/**
 * Firebase Adapter - Clean abstraction over Firebase Admin SDK
 * 
 * Provides storage, database, and authentication services
 */

import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  storageBucket: string;
  databaseURL?: string;
}

export interface UploadOptions {
  folder?: string;
  makePublic?: boolean;
  metadata?: Record<string, any>;
  customName?: string;
  presentationId?: string; // For backward compatibility
  owner?: string; // For backward compatibility
  format?: string; // For backward compatibility
  slideIndex?: number; // For backward compatibility
  strategy?: string; // For backward compatibility
  generated?: string; // For backward compatibility
}

export interface FileUploadResult {
  filename: string;
  url: string;
  downloadUrl: string;
  path: string;
  size: number;
  contentType: string;
  metadata?: Record<string, any>;
}

export interface DatabaseDocument {
  id: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class FirebaseAdapter {
  private readonly app: admin.app.App;
  private readonly storage: Bucket;
  private readonly firestore: admin.firestore.Firestore;
  private readonly config: FirebaseConfig;

  constructor(config: FirebaseConfig) {
    this.config = config;

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          privateKey: config.privateKey.replace(/\\n/g, '\n'),
          clientEmail: config.clientEmail,
        }),
        storageBucket: config.storageBucket,
        databaseURL: config.databaseURL,
      });
    } else {
      this.app = admin.app();
    }

    this.storage = admin.storage().bucket();
    this.firestore = admin.firestore();

    logger.info('Firebase adapter initialized', {
      projectId: config.projectId,
      storageBucket: config.storageBucket,
    });
  }

  // =============================================================================
  // STORAGE OPERATIONS
  // =============================================================================

  /**
   * Upload a file to Firebase Storage
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<FileUploadResult> {
    try {
      const {
        folder = 'uploads',
        makePublic = false,
        metadata = {},
        customName,
      } = options;

      const filename = customName || `${uuidv4()}_${originalName}`;
      const path = `${folder}/${filename}`;
      const file = this.storage.file(path);

      const stream = file.createWriteStream({
        metadata: {
          contentType,
          metadata: {
            ...metadata,
            originalName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          logger.error('File upload failed', { error, filename });
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            let url = '';
            let downloadUrl = '';

            if (makePublic) {
              await file.makePublic();
              url = `https://storage.googleapis.com/${this.config.storageBucket}/${path}`;
              downloadUrl = url;
            } else {
              // Generate signed URL valid for 1 hour
              const [signedUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
              });
              url = signedUrl;
              downloadUrl = signedUrl;
            }

            const [fileMetadata] = await file.getMetadata();

            const result: FileUploadResult = {
              filename,
              url,
              downloadUrl,
              path,
              size: parseInt(String(fileMetadata.size) || '0'),
              contentType,
              metadata: fileMetadata.metadata,
            };

            logger.info('File uploaded successfully', {
              filename,
              size: result.size,
              path,
            });

            resolve(result);
          } catch (error) {
            logger.error('Error processing uploaded file', { error, filename });
            reject(error);
          }
        });

        stream.end(buffer);
      });
    } catch (error) {
      logger.error('Upload file error', { error, originalName });
      throw error;
    }
  }

  /**
   * Upload multiple files concurrently
   */
  async uploadMultipleFiles(
    files: Array<{
      buffer: Buffer;
      originalName: string;
      contentType: string;
      options?: UploadOptions;
    }>
  ): Promise<FileUploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(
        file.buffer,
        file.originalName,
        file.contentType,
        file.options
      )
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const file = this.storage.file(path);
      await file.delete();
      logger.info('File deleted successfully', { path });
    } catch (error) {
      logger.error('Delete file error', { error, path });
      throw error;
    }
  }

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(path: string, expiresInMs: number = 3600000): Promise<string> {
    try {
      const file = this.storage.file(path);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMs,
      });
      return url;
    } catch (error) {
      logger.error('Get download URL error', { error, path });
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      const file = this.storage.file(path);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      logger.error('File exists check error', { error, path });
      return false;
    }
  }

  // =============================================================================
  // FIRESTORE OPERATIONS
  // =============================================================================

  /**
   * Save a document to Firestore
   */
  async saveDocument(
    collection: string,
    docId: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const docData = {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await this.firestore.collection(collection).doc(docId).set(docData, { merge: true });
      
      logger.info('Document saved successfully', {
        collection,
        docId,
        dataSize: JSON.stringify(data).length,
      });
    } catch (error) {
      logger.error('Save document error', { error, collection, docId });
      throw error;
    }
  }

  /**
   * Get a document from Firestore with generic typing
   */
  async getDocument<T = any>(collection: string, docId: string): Promise<T | null> {
    try {
      const doc = await this.firestore.collection(collection).doc(docId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (!data) {
        return null;
      }

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as T;
    } catch (error) {
      logger.error('Get document error', { error, collection, docId });
      throw error;
    }
  }

  /**
   * Query documents from Firestore with generic typing
   */
  async queryDocuments<T = any>(
    queryOrCollection: string | FirebaseFirestore.Query | FirebaseFirestore.CollectionReference,
    filters: Array<{
      field: string;
      operator: FirebaseFirestore.WhereFilterOp;
      value: any;
    }> = [],
    limit?: number,
    orderBy?: { field: string; direction: 'asc' | 'desc' }
  ): Promise<T[]> {
    try {
      let query: FirebaseFirestore.Query;

      if (typeof queryOrCollection === 'string') {
        query = this.firestore.collection(queryOrCollection);
      } else {
        query = queryOrCollection as FirebaseFirestore.Query;
      }

      // Apply filters
      filters.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as T;
      });
    } catch (error) {
      logger.error('Query documents error', { error, queryOrCollection, filters });
      throw error;
    }
  }

  /**
   * Delete a document from Firestore
   */
  async deleteDocument(collection: string, docId: string): Promise<void> {
    try {
      await this.firestore.collection(collection).doc(docId).delete();
      logger.info('Document deleted successfully', { collection, docId });
    } catch (error) {
      logger.error('Delete document error', { error, collection, docId });
      throw error;
    }
  }

  /**
   * Update a document in Firestore
   */
  async updateDocument(
    collection: string,
    docId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await this.firestore.collection(collection).doc(docId).update(updateData);
      
      logger.info('Document updated successfully', {
        collection,
        docId,
        updates: Object.keys(updates),
      });
    } catch (error) {
      logger.error('Update document error', { error, collection, docId });
      throw error;
    }
  }

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  /**
   * Create a batch write operation
   */
  createBatch(): admin.firestore.WriteBatch {
    return this.firestore.batch();
  }

  /**
   * Commit a batch operation
   */
  async commitBatch(batch: admin.firestore.WriteBatch): Promise<void> {
    try {
      await batch.commit();
      logger.info('Batch operation committed successfully');
    } catch (error) {
      logger.error('Batch commit error', { error });
      throw error;
    }
  }

  // =============================================================================
  // LEGACY COMPATIBILITY METHODS
  // =============================================================================

  /**
   * Legacy method: createDocument (alias for saveDocument)
   */
  async createDocument(
    collection: string,
    docId: string,
    data: Record<string, any>
  ): Promise<void> {
    return this.saveDocument(collection, docId, data);
  }

  /**
   * Legacy method: getCollection (returns query builder)
   */
  getCollection(collection: string): FirebaseFirestore.CollectionReference {
    return this.firestore.collection(collection);
  }

  /**
   * Legacy method: downloadFile (alias for getDownloadUrl)
   */
  async downloadFile(path: string): Promise<Buffer> {
    try {
      const file = this.storage.file(path);
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      logger.error('Download file error', { error, path });
      throw error;
    }
  }

  /**
   * Build a query from a collection reference
   */
  buildQuery(
    collection: string | FirebaseFirestore.CollectionReference,
    filters: Array<{
      field: string;
      operator: FirebaseFirestore.WhereFilterOp;
      value: any;
    }> = [],
    orderBy?: { field: string; direction: 'asc' | 'desc' },
    limit?: number,
    offset?: number
  ): FirebaseFirestore.Query {
    let query: FirebaseFirestore.Query;

    if (typeof collection === 'string') {
      query = this.firestore.collection(collection);
    } else {
      query = collection;
    }

    // Apply filters
    filters.forEach(({ field, operator, value }) => {
      query = query.where(field, operator, value);
    });

    // Apply ordering
    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction);
    }

    // Apply pagination
    if (offset) {
      query = query.offset(offset);
    }
    if (limit) {
      query = query.limit(limit);
    }

    return query;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Generate a unique document ID
   */
  generateDocumentId(): string {
    return this.firestore.collection('_').doc().id;
  }

  /**
   * Get server timestamp
   */
  getServerTimestamp(): admin.firestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    try {
      await this.app.delete();
      logger.info('Firebase adapter closed');
    } catch (error) {
      logger.error('Error closing Firebase adapter', { error });
    }
  }

  /**
   * Health check for Firebase services
   */
  async healthCheck(): Promise<{
    storage: boolean;
    firestore: boolean;
    overall: boolean;
  }> {
    const health = {
      storage: false,
      firestore: false,
      overall: false,
    };

    try {
      // Test storage
      const testFile = this.storage.file('health-check-test.txt');
      await testFile.save('test');
      await testFile.delete();
      health.storage = true;
    } catch (error) {
      logger.warn('Storage health check failed', { error });
    }

    try {
      // Test Firestore
      const testDoc = this.firestore.collection('health-check').doc('test');
      await testDoc.set({ timestamp: new Date() });
      await testDoc.delete();
      health.firestore = true;
    } catch (error) {
      logger.warn('Firestore health check failed', { error });
    }

    health.overall = health.storage && health.firestore;
    
    logger.info('Firebase health check completed', health);
    
    return health;
  }
}

export default FirebaseAdapter; 