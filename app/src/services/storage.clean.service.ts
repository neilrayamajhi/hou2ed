import { supabase } from "../lib/supabase";
import { Platform } from "react-native";
let ImageManipulator: any = null;
let FileSystem: any = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImageManipulator = require("expo-image-manipulator");
  // Use legacy API to avoid deprecation warnings
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem = require("expo-file-system/legacy");
}

const LISTING_IMAGES_BUCKET = "listing-images";
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
  if (Platform.OS === "web" || !ImageManipulator) return uri;
  try {
    const actions = resize ? [{ resize: IMAGE_SIZES[resize] }] : ([] as any[]);
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality ?? IMAGE_QUALITY,
      // Force JPEG to avoid HEIC/unsupported formats
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri || uri;
  } catch {
    return uri;
  }
}

export async function uploadListingImageClean(
  uri: string,
  listingId: string,
  opts: { resize?: keyof typeof IMAGE_SIZES; quality?: number } = {},
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  try {
    console.log("📤 [Clean Upload] Starting upload:", {
      uri,
      listingId,
      opts,
      platform: Platform.OS,
    });

    const processedUri = await processImage(uri, opts.resize, opts.quality);
    console.log("✅ [Clean Upload] Image processed:", processedUri);

    // Handle file reading differently for React Native vs Web
    let fileData: Blob | ArrayBuffer;
    let fileSize: number;

    if (Platform.OS === "web") {
      // Web: use standard fetch -> blob
      console.log("🌐 [Clean Upload] Using web fetch method");
      const resp = await fetch(processedUri);
      console.log("✅ [Clean Upload] Fetch response status:", resp.status);
      const blob = await resp.blob();
      fileData = blob;
      fileSize = blob.size;
      console.log("✅ [Clean Upload] Blob created, size:", fileSize);
    } else {
      // React Native: Always use FileSystem for reliability
      // RN's Blob doesn't work with Supabase, so we convert to ArrayBuffer
      console.log("📱 [Clean Upload] Using React Native FileSystem method");

      if (!FileSystem) {
        throw new Error("FileSystem not available on this platform");
      }

      // Read file info to get size
      const fileInfo = await FileSystem.getInfoAsync(processedUri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist at: " + processedUri);
      }
      fileSize = fileInfo.size || 0;
      console.log("✅ [Clean Upload] File info:", {
        size: fileSize,
        exists: fileInfo.exists,
      });

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(processedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log(
        "✅ [Clean Upload] File read as base64, length:",
        base64.length,
      );

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
      console.log(
        "✅ [Clean Upload] Converted to ArrayBuffer, size:",
        bytes.length,
      );
    }

    const fileName = generateFileName(`listing_${listingId}`, "jpg");
    const filePath = `${listingId}/${fileName}`;
    console.log("📁 [Clean Upload] Uploading to path:", filePath);

    const { data, error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(filePath, fileData, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("❌ [Clean Upload] Supabase error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Clean Upload] Supabase upload successful:", data);

    const {
      data: { publicUrl },
    } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(filePath);

    console.log("✅ [Clean Upload] Public URL generated:", publicUrl);

    return { success: true, url: publicUrl, path: filePath };
  } catch (e: any) {
    console.error("❌ [Clean Upload] Exception caught:", e);
    return { success: false, error: e?.message || "Upload failed" };
  }
}
