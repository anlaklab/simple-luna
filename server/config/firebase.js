/**
 * Firebase Configuration Module
 * 
 * Handles Firebase initialization and provides access to services
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let firebaseInitialized = false;
let firestore = null;
let sessionService = null;

/**
 * Initialize Firebase with credentials from environment
 * @returns {Promise<boolean>} Success status
 */
const initializeFirebase = async () => {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      
      // Check if Firebase is already initialized
      if (!admin.apps.length) {
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIRESTORE_DATABASE_URL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });

        firestore = admin.firestore();
        firebaseInitialized = true;
        console.log('✅ Firebase initialized successfully');
        
        // Initialize SessionService
        const SessionService = require('../services/session.service.js');
        sessionService = new SessionService(firestore);
        console.log('✅ SessionService initialized');
        
        return true;
      } else {
        console.log('✅ Firebase already initialized');
        firestore = admin.firestore();
        firebaseInitialized = true;
        return true;
      }
    } else {
      console.log('❌ Firebase credentials missing in environment variables');
      console.log('   FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Found' : 'Missing');
      console.log('   FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Found' : 'Missing');
      console.log('   FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Found' : 'Missing');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    return false;
  }
};

/**
 * Get Firestore instance
 * @returns {admin.firestore.Firestore|null}
 */
const getFirestore = () => firestore;

/**
 * Get SessionService instance
 * @returns {SessionService|null}
 */
const getSessionService = () => sessionService;

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
const isFirebaseInitialized = () => firebaseInitialized;

/**
 * Get Firebase admin instance
 * @returns {admin.app.App|null}
 */
const getFirebaseAdmin = () => admin.apps.length > 0 ? admin.app() : null;

module.exports = {
  initializeFirebase,
  getFirestore,
  getSessionService,
  isFirebaseInitialized,
  getFirebaseAdmin
}; 