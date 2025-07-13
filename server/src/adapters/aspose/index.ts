import { z } from "zod";
/**
 * Aspose Asset Extraction System - Main Exports
 * 
 * Exports all components of the modular asset extraction system.
 * This is the main entry point for using the refactored AssetService.
 */

// =============================================================================
// MAIN SERVICE - Use this for asset extraction
// =============================================================================

export { AssetServiceRefactored } from './services/AssetServiceRefactored';

// =============================================================================
// SPECIALIZED EXTRACTORS - Individual extractors by asset type
// =============================================================================

export { ImageAssetExtractor } from './extractors/assets/ImageAssetExtractor';
export { VideoAssetExtractor } from './extractors/assets/VideoAssetExtractor';
export { AudioAssetExtractor } from './extractors/assets/AudioAssetExtractor';
export { DocumentAssetExtractor } from './extractors/assets/DocumentAssetExtractor';

// =============================================================================
// CORE SERVICES - Supporting services for the asset system
// =============================================================================

export { AssetMetadataServiceImpl } from './services/AssetMetadataService';
export { AssetStorageServiceImpl } from './services/AssetStorageService';
export { AssetMetadataRepositoryImpl } from './services/AssetMetadataRepository';

// =============================================================================
// INTERFACES AND TYPES - All TypeScript definitions
// =============================================================================

export * from './types/asset-interfaces';

// =============================================================================
// LEGACY COMPATIBILITY - For backward compatibility
// =============================================================================

// Legacy AssetService removed - use AssetServiceRefactored instead
// export { AssetService } from './services/AssetService';

// =============================================================================
// FACTORY FUNCTION - Easy way to create configured AssetService
// =============================================================================

import { AssetServiceRefactored } from './services/AssetServiceRefactored';
import { AssetServiceConfig } from './types/asset-interfaces';

/**
 * Factory function to create a fully configured AssetService
 */
export function createAssetService async (config: AssetServiceConfig): AssetServiceRefactored {
  return new AssetServiceRefactored(config);
}

/**
 * Create AssetService with default configuration
 */
export function createDefaultAssetService async (firebaseConfig: {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  storageBucket: string;
}): AssetServiceRefactored {
  const defaultConfig: AssetServiceConfig = {
    aspose: {
      licenseFilePath: './lib/Aspose.Slides.lic',
      tempDirectory: './temp/aspose'
    },
    firebase: firebaseConfig,
    storage: {
      defaultFolder: 'extracted-assets',
      generateThumbnails: true,
      thumbnailSize: { width: 200, height: 150, aspectRatio: 1.33 },
      maxFileSize: 100 * 1024 * 1024 // 100MB
    },
    processing: {
      defaultImageQuality: 85,
      enableParallelProcessing: true,
      maxConcurrentExtractions: 4,
      timeoutMs: 5 * 60 * 1000 // 5 minutes
    }
  };

  return new AssetServiceRefactored(defaultConfig);
}

// =============================================================================
// USAGE EXAMPLES AND DOCUMENTATION
// =============================================================================

/**
 * Asset Extraction System Usage Examples
 * 
 * ## Basic Usage
 * 
 * ```typescript
 * import { createAssetService } from './adapters/aspose';
 * 
 * const assetService = createAssetService(config);
 * 
 * // Extract all assets
 * const assets = await assetService.extractAssets('./presentation.pptx');
 * 
 * // Extract only images
 * const images = await assetService.extractAssetsByType('./presentation.pptx', 'image');
 * 
 * // Extract from specific slides
 * const rangeAssets = await assetService.extractAssetsFromSlideRange('./presentation.pptx', 0, 5);
 * ```
 * 
 * ## Advanced Usage
 * 
 * ```typescript
 * // Custom extraction options
 * const assets = await assetService.extractAssets('./presentation.pptx', {
 *   assetTypes: ['image', 'video'],
 *   returnFormat: 'firebase-urls',
 *   extractThumbnails: true,
 *   saveToFirebase: true,
 *   firebaseFolder: 'my-presentation-assets',
 *   makePublic: false,
 *   generateDownloadUrls: true,
 *   slideRange: { start: 0, end: 10 },
 *   includeMetadata: true,
 *   includeTransforms: true,
 *   includeStyles: true
 * });
 * 
 * // Search assets
 * const searchResults = await assetService.searchAssets('presentation-id', {
 *   type: 'image',
 *   format: 'png',
 *   sizeRange: { min: 1024, max: 1024 * 1024 }
 * });
 * 
 * // Get statistics
 * const stats = await assetService.getExtractionStatistics('presentation-id');
 * ```
 * 
 * ## Key Features
 * 
 * - ✅ **Real Asset Extraction**: Uses local Aspose.Slides library
 * - ✅ **No Mock Data**: Processes actual file content
 * - ✅ **All Slides Processed**: Never limits slide count
 * - ✅ **Firebase Integration**: Automatic storage and metadata persistence
 * - ✅ **Comprehensive Metadata**: Detailed information for each asset
 * - ✅ **Scalable Architecture**: Modular, maintainable design
 * - ✅ **TypeScript Support**: Full type safety
 * - ✅ **Error Handling**: Robust error management
 * - ✅ **Parallel Processing**: Optional concurrent extraction
 * - ✅ **Thumbnail Generation**: Automatic preview creation
 * 
 * ## Architecture
 * 
 * The system follows a modular architecture with clear separation of concerns:
 * 
 * - **AssetServiceRefactored**: Main orchestrator
 * - **Specialized Extractors**: One for each asset type (Image, Video, Audio, Document)
 * - **MetadataService**: Comprehensive metadata generation
 * - **StorageService**: Firebase Storage integration
 * - **Repository**: Firestore metadata persistence
 * - **Interfaces**: Complete TypeScript definitions
 */ 