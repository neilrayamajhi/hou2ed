import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

// Constants
const LISTING_IMAGES_BUCKET = 'listing-images';
const APPLICATION_DOCS_BUCKET = 'application-docs';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_QUALITY = 0.8;
const CACHE_DIR = FileSystem.cacheDirectory + 'images/';

// Image dimensions
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  card: { width: 400, height: 300 },
  full: { width: 1200, height: 900 },
};

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

interface ImageUploadOptions {
  resize?: keyof typeof IMAGE_SIZES;
  quality?: number;
  bucket?: string;
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir() {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Generate unique filename
 */
function generateFileName(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Compress and resize image
 */
async function processImage(
  uri: string,
  options: ImageUploadOptions
): Promise<string> {
  try {
    const manipulatorOptions: ImageManipulator.Action[] = [];

    // Add resize if specified
    if (options.resize && IMAGE_SIZES[options.resize]) {
      manipulatorOptions.push({
        resize: IMAGE_SIZES[options.resize],
      });
    }

    // Process image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      manipulatorOptions,
      {
        compress: options.quality || IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Image processing error:', error);
    return uri; // Return original if processing fails
  }
}

/**
 * Upload image to Supabase storage
 */
export async function uploadListingImage(
  uri: string,
  listingId: string,
  options: ImageUploadOptions = {}
): Promise<UploadResult> {
  try {
    // Process image
    const processedUri = await processImage(uri, options);

    // Read file as blob
    const response = await fetch(processedUri);
    const blob = await response.blob();

    // Check file size
    if (blob.size > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`,
      };
    }

    // Generate unique filename
    const fileName = generateFileName(`listing_${listingId}`, 'jpg');
    const filePath = `${listingId}/${fileName}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Upload listing image error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload multiple images with progress tracking
 */
export async function uploadMultipleImages(
  uris: string[],
  listingId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const total = uris.length;

  for (let i = 0; i < uris.length; i++) {
    const result = await uploadListingImage(uris[i], listingId, {
      resize: 'full',
    });
    results.push(result);

    if (onProgress) {
      onProgress((i + 1) / total);
    }
  }

  return results;
}

/**
 * Upload document to application storage
 */
export async function uploadApplicationDocument(
  uri: string,
  applicationId: string,
  documentType: string
): Promise<UploadResult> {
  try {
    // Read file
    const response = await fetch(uri);
    const blob = await response.blob();

    // Check file size
    if (blob.size > MAX_DOC_SIZE) {
      return {
        success: false,
        error: `Document size exceeds ${MAX_DOC_SIZE / 1024 / 1024}MB limit`,
      };
    }

    // Determine file extension from URI or MIME type
    const extension = uri.split('.').pop() || 'pdf';
    const fileName = generateFileName(`doc_${documentType}`, extension);
    const filePath = `${applicationId}/${fileName}`;

    // Upload to Supabase (private bucket)
    const { data, error } = await supabase.storage
      .from(APPLICATION_DOCS_BUCKET)
      .upload(filePath, blob, {
        contentType: blob.type || 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      path: filePath,
    };
  } catch (error) {
    console.error('Upload document error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Get signed URL for private document
 */
export async function getDocumentSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(APPLICATION_DOCS_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Get signed URL error:', error);
    return null;
  }
}

/**
 * Delete image from storage
 */
export async function deleteListingImage(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove([path]);

    if (error) {
      console.error('Delete image error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete image error:', error);
    return false;
  }
}

/**
 * Cache image locally for offline access
 */
export async function cacheImage(url: string): Promise<string | null> {
  try {
    await ensureCacheDir();

    // Generate cache file path
    const filename = url.split('/').pop() || 'image.jpg';
    const fileUri = CACHE_DIR + filename;

    // Check if already cached
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      return fileUri;
    }

    // Download and cache
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    return downloadResult.uri;
  } catch (error) {
    console.error('Cache image error:', error);
    return null;
  }
}

/**
 * Clear image cache
 */
export async function clearImageCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    await ensureCacheDir();
  } catch (error) {
    console.error('Clear cache error:', error);
  }
}

/**
 * Prefetch images for better performance
 */
export async function prefetchImages(urls: string[]): Promise<void> {
  if (Platform.OS === 'web') {
    // For web, use browser's image preloading
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  } else {
    // For native, cache images
    await Promise.all(urls.map(url => cacheImage(url)));
  }
}

/**
 * Get image dimensions from URI
 */
export async function getImageDimensions(uri: string): Promise<{ width: number; height: number } | null> {
  try {
    // This requires expo-image or similar library for getting dimensions
    // For now, returning null as placeholder
    return null;
  } catch (error) {
    console.error('Get dimensions error:', error);
    return null;
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: { type?: string; size?: number }): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (file.type && !validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    };
  }

  if (file.size && file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  return { valid: true };
}

/**
 * Validate document file
 */
export function validateDocumentFile(file: { type?: string; size?: number }): { valid: boolean; error?: string } {
  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (file.type && !validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, images, or Word documents.',
    };
  }

  if (file.size && file.size > MAX_DOC_SIZE) {
    return {
      valid: false,
      error: `Document size exceeds ${MAX_DOC_SIZE / 1024 / 1024}MB limit`,
    };
  }

  return { valid: true };
}