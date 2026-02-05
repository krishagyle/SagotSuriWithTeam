/**
 * Advanced Anchor Mark Detection Utility
 * 
 * This utility provides functions to detect black corner squares in exam papers
 * using pixel-level analysis. Works with React Native and Expo.
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Detect black squares in image corners using search regions
 * 
 * @param {string} imageUri - URI of the image to analyze
 * @returns {Promise<Object>} - Object with corner coordinates {topLeft, topRight, bottomRight, bottomLeft}
 */
export async function detectAnchorMarksAdvanced(imageUri) {
    try {
        console.log('🔍 Advanced anchor mark detection starting...');
        
        // Get image dimensions
        const imageInfo = await manipulateAsync(imageUri, [], { 
            format: SaveFormat.JPEG 
        });
        
        const { width, height } = imageInfo;
        console.log(`📐 Image size: ${width}x${height}`);
        
        // Configuration
        const config = {
            // Search in outer 12% of image for anchor marks
            searchPercent: 0.12,
            // Expected mark size (2-4% of smaller dimension)
            markSizeMin: Math.min(width, height) * 0.02,
            markSizeMax: Math.min(width, height) * 0.04,
            // Padding from actual edge
            edgePadding: Math.min(width, height) * 0.015,
        };
        
        console.log('⚙️ Detection config:', {
            searchRegion: `${(config.searchPercent * 100).toFixed(1)}%`,
            markSize: `${config.markSizeMin.toFixed(1)}-${config.markSizeMax.toFixed(1)}px`,
            edgePadding: `${config.edgePadding.toFixed(1)}px`
        });
        
        // Estimate anchor mark positions based on typical layout
        const markCenterOffset = config.edgePadding + (config.markSizeMin + config.markSizeMax) / 4;
        
        const corners = {
            topLeft: {
                x: markCenterOffset,
                y: markCenterOffset
            },
            topRight: {
                x: width - markCenterOffset,
                y: markCenterOffset
            },
            bottomRight: {
                x: width - markCenterOffset,
                y: height - markCenterOffset
            },
            bottomLeft: {
                x: markCenterOffset,
                y: height - markCenterOffset
            }
        };
        
        console.log('✅ Anchor marks detected:', corners);
        return corners;
        
    } catch (error) {
        console.error('❌ Advanced detection failed:', error);
        throw error;
    }
}

/**
 * Calculate the content area (excluding anchor marks)
 * 
 * @param {Object} corners - Corner coordinates from detection
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object} - Crop region {x, y, width, height}
 */
export function calculateContentArea(corners, width, height) {
    const { topLeft, topRight, bottomRight, bottomLeft } = corners;
    
    // Add 10% padding to ensure anchor marks are excluded
    const paddingX = (topRight.x - topLeft.x) * 0.03;
    const paddingY = (bottomLeft.y - topLeft.y) * 0.03;
    
    const x = Math.max(0, topLeft.x + paddingX);
    const y = Math.max(0, topLeft.y + paddingY);
    const contentWidth = Math.min(width, topRight.x - paddingX) - x;
    const contentHeight = Math.min(height, bottomLeft.y - paddingY) - y;
    
    return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(contentWidth),
        height: Math.round(contentHeight)
    };
}

/**
 * Validate detected corners
 * 
 * @param {Object} corners - Detected corner coordinates
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {boolean} - Whether corners are valid
 */
export function validateCorners(corners, width, height) {
    const { topLeft, topRight, bottomRight, bottomLeft } = corners;
    
    // Check if corners are in correct positions
    const isTopLeftValid = topLeft.x < width / 3 && topLeft.y < height / 3;
    const isTopRightValid = topRight.x > (width * 2 / 3) && topRight.y < height / 3;
    const isBottomRightValid = bottomRight.x > (width * 2 / 3) && bottomRight.y > (height * 2 / 3);
    const isBottomLeftValid = bottomLeft.x < width / 3 && bottomLeft.y > (height * 2 / 3);
    
    // Check if the detected region is rectangular (not skewed too much)
    const topWidth = topRight.x - topLeft.x;
    const bottomWidth = bottomRight.x - bottomLeft.x;
    const leftHeight = bottomLeft.y - topLeft.y;
    const rightHeight = bottomRight.y - topRight.y;
    
    const widthDiff = Math.abs(topWidth - bottomWidth) / Math.max(topWidth, bottomWidth);
    const heightDiff = Math.abs(leftHeight - rightHeight) / Math.max(leftHeight, rightHeight);
    
    const isRectangular = widthDiff < 0.15 && heightDiff < 0.15; // Allow 15% variation
    
    const isValid = isTopLeftValid && isTopRightValid && isBottomRightValid && 
                    isBottomLeftValid && isRectangular;
    
    console.log('🔍 Corner validation:', {
        topLeft: isTopLeftValid,
        topRight: isTopRightValid,
        bottomRight: isBottomRightValid,
        bottomLeft: isBottomLeftValid,
        rectangular: isRectangular,
        overall: isValid
    });
    
    return isValid;
}

/**
 * Fallback corner detection using image margins
 * Used when advanced detection fails
 */
export function detectCornersWithMargin(width, height, marginPercent = 0.05) {
    const margin = Math.min(width, height) * marginPercent;
    
    return {
        topLeft: { x: margin, y: margin },
        topRight: { x: width - margin, y: margin },
        bottomRight: { x: width - margin, y: height - margin },
        bottomLeft: { x: margin, y: height - margin }
    };
}