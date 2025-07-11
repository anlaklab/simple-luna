/**
 * Shared Adapters - Centralized External Service Integration
 * 
 * Provides reusable adapters for external services that can be shared
 * across all feature modules. Implements BaseAdapter interface for consistency.
 */

import { BaseAdapter, ServiceHealth } from '../interfaces/base.interfaces';

// =============================================================================
// FIREBASE SHARED ADAPTER
// =============================================================================

export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  storageBucket: string;
}

export class FirebaseSharedAdapter implements BaseAdapter<FirebaseConfig> {
  readonly name = 'firebase';
  readonly type = 'database' as const;
  
  private config?: FirebaseConfig;
  private admin: any;
  private firestore: any;
  private storage: any;
  private connected = false;

  async initialize(config: FirebaseConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize Firebase Admin SDK
      const admin = require('firebase-admin');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.projectId,
            privateKey: config.privateKey.replace(/\\n/g, '\n'),
            clientEmail: config.clientEmail,
          }),
          storageBucket: config.storageBucket,
        });
      }
      
      this.admin = admin;
      this.firestore = admin.firestore();
      this.storage = admin.storage();
      this.connected = true;
      
      console.log('✅ Firebase Shared Adapter initialized');
    } catch (error) {
      console.error('❌ Firebase Shared Adapter initialization failed:', (error as Error).message);
      this.connected = false;
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.firestore;
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          lastCheck: new Date(),
          errors: ['Firebase not connected']
        };
      }

      // Test Firestore connection
      await this.firestore.collection('_health').limit(1).get();
      
      return {
        status: 'healthy',
        lastCheck: new Date(),
        details: {
          projectId: this.config?.projectId,
          collections: ['presentations', 'sessions', 'users']
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        errors: [(error as Error).message]
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.admin) {
      await this.admin.app().delete();
    }
    this.connected = false;
    console.log('🔌 Firebase Shared Adapter disconnected');
  }

  // Public interface methods for modules to use
  getFirestore() {
    if (!this.firestore) {
      throw new Error('Firebase Firestore not initialized');
    }
    return this.firestore;
  }

  getStorage() {
    if (!this.storage) {
      throw new Error('Firebase Storage not initialized');
    }
    return this.storage;
  }

  getAdmin() {
    if (!this.admin) {
      throw new Error('Firebase Admin not initialized');
    }
    return this.admin;
  }
}

// =============================================================================
// OPENAI SHARED ADAPTER
// =============================================================================

export interface OpenAIConfig {
  apiKey: string;
  organizationId?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAISharedAdapter implements BaseAdapter<OpenAIConfig> {
  readonly name = 'openai';
  readonly type = 'external_api' as const;
  
  private config?: OpenAIConfig;
  private client: any;
  private connected = false;

  async initialize(config: OpenAIConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize OpenAI client
      const { OpenAI } = require('openai');
      this.client = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organizationId,
      });
      
      this.connected = true;
      console.log('✅ OpenAI Shared Adapter initialized');
    } catch (error) {
      console.error('❌ OpenAI Shared Adapter initialization failed:', (error as Error).message);
      this.connected = false;
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.client;
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          lastCheck: new Date(),
          errors: ['OpenAI client not connected']
        };
      }

      // Test API connection with a minimal request
      const response = await this.client.models.list();
      
      return {
        status: 'healthy',
        lastCheck: new Date(),
        details: {
          model: this.config?.model,
          modelsAvailable: response.data?.length || 0
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        lastCheck: new Date(),
        errors: [(error as Error).message]
      };
    }
  }

  // Public interface methods for modules to use
  getClient() {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    return this.client;
  }

  getConfig() {
    if (!this.config) {
      throw new Error('OpenAI config not available');
    }
    return this.config;
  }
}

// =============================================================================
// ASPOSE SHARED ADAPTER
// =============================================================================

export interface AsposeConfig {
  licenseFilePath?: string;
  tempDirectory?: string;
  maxFileSize?: number;
  javaHome?: string;
}

export class AsposeSharedAdapter implements BaseAdapter<AsposeConfig> {
  readonly name = 'aspose';
  readonly type = 'library' as const;
  
  private config?: AsposeConfig;
  private asposeDriver: any;
  private connected = false;

  async initialize(config: AsposeConfig = {}): Promise<void> {
    try {
      this.config = {
        licenseFilePath: './Aspose.Slides.Product.Family.lic',
        tempDirectory: './temp/aspose',
        maxFileSize: 62914560, // 60MB default
        ...config
      };
      
      // ✅ REFACTORED: Use AsposeDriverFactory instead of direct import
      this.asposeDriver = require('/app/lib/AsposeDriverFactory');
      await this.asposeDriver.initialize();
      
      // Test basic functionality
      const testPresentation = await this.asposeDriver.createPresentation();
      if (testPresentation && testPresentation.dispose) {
        testPresentation.dispose();
      }
      
      this.connected = true;
      console.log('✅ Aspose Shared Adapter initialized with AsposeDriverFactory');
    } catch (error) {
      console.error('❌ Aspose Shared Adapter initialization failed:', (error as Error).message);
      this.connected = false;
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.asposeDriver;
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          lastCheck: new Date(),
          errors: ['AsposeDriverFactory not loaded']
        };
      }

      // Test library functionality using AsposeDriverFactory
      const testPresentation = await this.asposeDriver.createPresentation();
      const isWorking = !!testPresentation;
      
      if (testPresentation && testPresentation.dispose) {
        testPresentation.dispose();
      }
      
      return {
        status: isWorking ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        details: {
          driverPath: '/app/lib/AsposeDriverFactory',
          licenseFile: this.config?.licenseFilePath,
          tempDirectory: this.config?.tempDirectory
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        errors: [(error as Error).message]
      };
    }
  }

  // Public interface methods for modules to use
  getAsposeDriver() {
    if (!this.asposeDriver) {
      throw new Error('AsposeDriverFactory not initialized');
    }
    return this.asposeDriver;
  }

  getConfig() {
    if (!this.config) {
      throw new Error('Aspose config not available');
    }
    return this.config;
  }

  async createPresentation(filePath?: string) {
    const driver = this.getAsposeDriver();
    return filePath ? await driver.loadPresentation(filePath) : await driver.createPresentation();
  }
}

// =============================================================================
// ADAPTER REGISTRY (Singleton)
// =============================================================================

export class SharedAdapterRegistry {
  private static instance: SharedAdapterRegistry;
  private adapters = new Map<string, BaseAdapter>();

  private constructor() {}

  public static getInstance(): SharedAdapterRegistry {
    if (!SharedAdapterRegistry.instance) {
      SharedAdapterRegistry.instance = new SharedAdapterRegistry();
    }
    return SharedAdapterRegistry.instance;
  }

  register(name: string, adapter: BaseAdapter): void {
    this.adapters.set(name, adapter);
  }

  get<T extends BaseAdapter>(name: string): T {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter not found: ${name}`);
    }
    return adapter as T;
  }

  getFirebase(): FirebaseSharedAdapter {
    return this.get<FirebaseSharedAdapter>('firebase');
  }

  getOpenAI(): OpenAISharedAdapter {
    return this.get<OpenAISharedAdapter>('openai');
  }

  getAspose(): AsposeSharedAdapter {
    return this.get<AsposeSharedAdapter>('aspose');
  }

  async initializeAll(configs: {
    firebase?: FirebaseConfig;
    openai?: OpenAIConfig;
    aspose?: AsposeConfig;
  }): Promise<void> {
    const promises = [];

    // Initialize Firebase if config provided
    if (configs.firebase) {
      const firebaseAdapter = new FirebaseSharedAdapter();
      promises.push(firebaseAdapter.initialize(configs.firebase));
      this.register('firebase', firebaseAdapter);
    }

    // Initialize OpenAI if config provided
    if (configs.openai) {
      const openaiAdapter = new OpenAISharedAdapter();
      promises.push(openaiAdapter.initialize(configs.openai));
      this.register('openai', openaiAdapter);
    }

    // Initialize Aspose
    const asposeAdapter = new AsposeSharedAdapter();
    promises.push(asposeAdapter.initialize(configs.aspose || {}));
    this.register('aspose', asposeAdapter);

    await Promise.all(promises);
    console.log('✅ All shared adapters initialized');
  }

  async healthCheckAll(): Promise<Record<string, ServiceHealth>> {
    const results: Record<string, ServiceHealth> = {};
    
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          lastCheck: new Date(),
          errors: [(error as Error).message]
        };
      }
    }
    
    return results;
  }

  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const sharedAdapters = SharedAdapterRegistry.getInstance(); 