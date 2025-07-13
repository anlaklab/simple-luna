import { z } from "zod";
/**
 * Effect Extractor - Handles shadow, glow, reflection, 3D effects
 */

import { logger } from '../../utils/logger';
import { ColorUtils } from './color-utils';

export class EffectExtractor {
  private colorUtils: ColorUtils;

  constructor() {
    this.colorUtils = new ColorUtils();
  }

  /**
   * Extract effect format (shadow, glow, reflection)
   */
  extractEffectFormat(effectFormat: any): any | null {
    try {
      if (!effectFormat) return null;

      const result: any = {
        hasEffects: false,
      };

      // Extract shadow effect
      if (effectFormat.getOuterShadowEffect && effectFormat.getOuterShadowEffect()) {
        const shadow = effectFormat.getOuterShadowEffect();
        result.hasEffects = true;
        result.shadowEffect = {
          blurRadius: shadow.getBlurRadius ? shadow.getBlurRadius() : undefined,
          direction: shadow.getDirection ? shadow.getDirection() : undefined,
          distance: shadow.getDistance ? shadow.getDistance() : undefined,
          shadowColor: shadow.getShadowColor ? this.colorUtils.colorToHex(shadow.getShadowColor().getColor()) : undefined,
        };
      }

      // Extract glow effect
      if (effectFormat.getGlowEffect && effectFormat.getGlowEffect()) {
        const glow = effectFormat.getGlowEffect();
        result.hasEffects = true;
        result.glowEffect = {
          radius: glow.getRadius ? glow.getRadius() : undefined,
          color: glow.getColor ? this.colorUtils.colorToHex(glow.getColor().getColor()) : undefined,
        };
      }

      // Extract reflection effect
      if (effectFormat.getReflectionEffect && effectFormat.getReflectionEffect()) {
        const reflection = effectFormat.getReflectionEffect();
        result.hasEffects = true;
        result.reflectionEffect = {
          blurRadius: reflection.getBlurRadius ? reflection.getBlurRadius() : undefined,
          startReflectionOpacity: reflection.getStartReflectionOpacity ? reflection.getStartReflectionOpacity() / 100 : undefined,
          endReflectionOpacity: reflection.getEndReflectionOpacity ? reflection.getEndReflectionOpacity() / 100 : undefined,
        };
      }

      return result.hasEffects ? result : null;
    } catch (error) {
      logger.error('Error extracting effect format', { error });
      return null;
    }
  }

  /**
   * Extract 3D format properties
   */
  extractThreeDFormat(threeDFormat: any): any | null {
    try {
      if (!threeDFormat) return null;

      const result: any = {
        depth: threeDFormat.getDepth ? threeDFormat.getDepth() : 0,
        contourWidth: threeDFormat.getContourWidth ? threeDFormat.getContourWidth() : 0,
        extrusionHeight: threeDFormat.getExtrusionHeight ? threeDFormat.getExtrusionHeight() : 0,
      };

      // Extract bevel properties
      if (threeDFormat.getBevelTop) {
        const bevelTop = threeDFormat.getBevelTop();
        if (bevelTop && (bevelTop.getWidth() > 0 || bevelTop.getHeight() > 0)) {
          result.bevelTop = {
            bevelType: bevelTop.getBevelType ? bevelTop.getBevelType() : undefined,
            width: bevelTop.getWidth ? bevelTop.getWidth() : undefined,
            height: bevelTop.getHeight ? bevelTop.getHeight() : undefined,
          };
        }
      }

      // Extract light rig
      if (threeDFormat.getLightRig) {
        const lightRig = threeDFormat.getLightRig();
        if (lightRig) {
          result.lightRig = {
            lightType: lightRig.getLightType ? lightRig.getLightType() : undefined,
            direction: lightRig.getDirection ? lightRig.getDirection() : undefined,
          };
        }
      }

      // Extract camera
      if (threeDFormat.getCamera) {
        const camera = threeDFormat.getCamera();
        if (camera) {
          result.camera = {
            cameraType: camera.getCameraType ? camera.getCameraType() : undefined,
            fieldOfView: camera.getFieldOfViewAngle ? camera.getFieldOfViewAngle() : undefined,
            zoom: camera.getZoom ? camera.getZoom() : undefined,
          };
        }
      }

      return result;
    } catch (error) {
      logger.error('Error extracting 3D format', { error });
      return null;
    }
  }
}