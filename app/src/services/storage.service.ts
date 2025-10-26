import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
// Avoid importing native-only modules at top-level so web bundler doesn't choke
// We'll require them lazily only on native platforms
let FileSystem: any = null;
let ImageManipulator: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem = require('expo-file-system');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImageManipulator = require('expo-image-manipulator');
}

// Constants
const LISTING_IMAGES_BUCKET = 'listing-images';
const APPLICATION_DOCS_BUCKET = 'application-docs';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_QUALITY = 0.8;
const CACHE_DIR = Platform.OS !== 'web' && FileSystem?.cacheDirectory
  ? FileSystem.cacheDirectory + 'images/'
  : '/tmp/images/';

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
  if (Platform.OS === 'web' || !FileSystem) return; // no-op on web
  try {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  } catch (error) {
    // Directory might already exist, that's fine
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
  if (Platform.OS === 'web' || !ImageManipulator) return uri;
  try {
    const manipulatorOptions: any[] = [];
    if (options.resize && IMAGE_SIZES[options.resize]) {
      manipulatorOptions.push({ resize: IMAGE_SIZES[options.resize] });
    }
    const result = await ImageManipulator.manipulateAsync(uri, manipulatorOptions, {
      compress: options.quality || IMAGE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch (error) {
    console.error('Image processing error:', error);
    return uri;
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
    console.log('📤 Starting image upload:', { uri, listingId, options });

    // Process image
    const processedUri = await processImage(uri, options);
    console.log('✅ Image processed:', processedUri);

    // Read file - different approach for React Native vs Web
    let fileData: any;
    let fileSize: number;

    if (Platform.OS === 'web') {
      // Web: use blob
      const response = await fetch(processedUri);
      const blob = await response.blob();
      fileData = blob;
      fileSize = blob.size;
    } else {
      // React Native: Read file as ArrayBuffer
      if (!FileSystem) {
        throw new Error('Cannot read image file - FileSystem not available');
      }

      console.log('📱 Reading file for React Native upload...');

      // Read file as base64 (no need for getInfoAsync - deprecated)
      const base64String = await FileSystem.readAsStringAsync(processedUri, {
        encoding: 'base64',
      });

      console.log('✅ File read as base64, length:', base64String.length);

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Use the ArrayBuffer directly
      fileData = bytes.buffer;
      fileSize = bytes.length;

      console.log('✅ Converted to ArrayBuffer, size:', fileSize);
    }

    console.log('✅ File loaded, size:', fileSize);

    // Check file size
    if (fileSize > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`,
      };
    }

    // Generate unique filename
    const fileName = generateFileName(`listing_${listingId}`, 'jpg');
    const filePath = `${listingId}/${fileName}`;

    console.log('📁 Uploading to:', filePath);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(filePath, fileData, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    console.log('✅ Public URL:', publicUrl);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('❌ Upload listing image error:', error);
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
    if (Platform.OS === 'web' || !FileSystem) {
      // Caching not needed on web
      return url;
    }

    await ensureCacheDir();

    // Generate cache file path
    const filename = url.split('/').pop() || 'image.jpg';
    const fileUri = CACHE_DIR + filename;

    // Try to download (will skip if file exists)
    try {
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      return downloadResult.uri;
    } catch (downloadError) {
      // File might already exist or download failed
      console.log('Cache download info:', downloadError);
      return fileUri; // Return the path anyway
    }
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
