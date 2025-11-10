import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
let ImageManipulator: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImageManipulator = require('expo-image-manipulator');
}

const LISTING_IMAGES_BUCKET = 'listing-images';
const IMAGE_QUALITY = 0.8;
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  card: { width: 400, height: 300 },
  full: { width: 1200, height: 900 },
};

function generateFileName(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

async function processImage(
  uri: string,
  resize?: keyof typeof IMAGE_SIZES,
  quality?: number,
): Promise<string> {
  if (Platform.OS === 'web' || !ImageManipulator) return uri;
  try {
    const actions = resize ? [{ resize: IMAGE_SIZES[resize] }] : [] as any[];
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: quality ?? IMAGE_QUALITY,
        // Force JPEG to avoid HEIC/unsupported formats
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    return result.uri || uri;
  } catch {
    return uri;
  }
}

export async function uploadListingImageClean(
  uri: string,
  listingId: string,
  opts: { resize?: keyof typeof IMAGE_SIZES; quality?: number } = {}
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  try {
    const processedUri = await processImage(uri, opts.resize, opts.quality);
    const resp = await fetch(processedUri);
    const blob = await resp.blob();

    const fileName = generateFileName(`listing_${listingId}`, 'jpg');
    const filePath = `${listingId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });
    if (error) return { success: false, error: error.message };

    const { data: { publicUrl } } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl, path: filePath };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Upload failed' };
  }
}
