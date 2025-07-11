// 🔥 Firebase Configuration
// Simplified Firebase setup for Luna Platform

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '../utils/logger';

// Initialize Firebase Admin if not already initialized
let app;
if (getApps().length === 0) {
  try {
    // Use environment variables for Firebase config
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    logger.info('Firebase Admin initialized successfully');
  } catch (error) {
    logger.warn('Firebase initialization failed, continuing without Firebase:', error as Error);
    // Create a mock app for development
    app = null;
  }
} else {
  app = getApps()[0];
}

// Export Firebase services
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const firebaseApp = app;

// Helper functions
export const getDocument = async (collection: string, id: string) => {
  if (!db) throw new Error('Firestore not initialized');
  const doc = await db.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const saveDocument = async (collection: string, id: string, data: any) => {
  if (!db) throw new Error('Firestore not initialized');
  await db.collection(collection).doc(id).set(data);
  return { id, ...data };
}; 