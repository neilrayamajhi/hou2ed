import { supabase } from '../lib/supabase';
import { supabaseStorageService } from '../lib/supabaseService';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

class AttachmentService {
  private readonly BUCKET_NAME = 'message-attachments';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_IMAGE_DIMENSION = 2000; // Max width/height for images

  /**
   * Initialize the attachment service - create bucket if needed
   */
  async initialize() {
    try {
      // Use service client to check if bucket exists (bypasses RLS)
      const { data: buckets, error: listError } = await supabaseStorageService.storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(b => b.name === this.BUCKET_NAME);

      if (!bucketExists) {
        // Create the bucket using service client
        const { error: createError } = await supabaseStorageService.storage.createBucket(
          this.BUCKET_NAME,
          {
            public: false, // Private bucket - URLs need auth
            fileSizeLimit: this.MAX_FILE_SIZE,
            allowedMimeTypes: [
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp',
              'application/pdf',
              'text/plain',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
          }
        );

        if (createError) {
          console.error('Error creating attachments bucket:', createError);
        } else {
          console.log('✅ Created message-attachments bucket');
        }
      }
    } catch (error) {
      console.error('Failed to initialize attachment service:', error);
    }
  }

  /**
   * Upload an attachment from a local URI
   */
  async uploadAttachment(
    uri: string,
    threadId: string,
    userId: string,
    mimeType?: string
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = this.getFileExtension(uri, mimeType);
      const filename = `${threadId}/${userId}/${timestamp}-${random}${extension}`;

      let fileToUpload = uri;
      let finalMimeType = mimeType || 'application/octet-stream';

      // If it's an image, compress it
      if (this.isImage(mimeType)) {
        const compressed = await this.compressImage(uri);
        fileToUpload = compressed.uri;
        finalMimeType = 'image/jpeg'; // Compression always outputs JPEG
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileToUpload, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(fileToUpload);
      const fileSize = (fileInfo as any).size || 0;

      // Check file size
      if (fileSize > this.MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: finalMimeType });

      // Upload to Supabase storage using service client (bypasses RLS)
      const { data, error } = await supabaseStorageService.storage
        .from(this.BUCKET_NAME)
        .upload(filename, blob, {
          contentType: finalMimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL using service client
      const { data: { publicUrl } } = supabaseStorageService.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filename);

      return {
        url: publicUrl,
        path: filename,
        size: fileSize,
        mimeType: finalMimeType
      };
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      throw error;
    }
  }

  /**
   * Upload multiple attachments
   */
  async uploadMultiple(
    uris: string[],
    threadId: string,
    userId: string
  ): Promise<string[]> {
    try {
      const uploadPromises = uris.map(uri =>
        this.uploadAttachment(uri, threadId, userId)
      );

      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads = results
        .filter(result => result.status === 'fulfilled')
        .map((result: any) => result.value.url);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to upload attachment ${index + 1}:`, result.reason);
        }
      });

      return successfulUploads;
    } catch (error) {
      console.error('Failed to upload multiple attachments:', error);
      return [];
    }
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(path: string): Promise<boolean> {
    try {
      const { error } = await supabaseStorageService.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error('Error deleting attachment:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      return false;
    }
  }

  /**
   * Get a signed URL for downloading an attachment
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabaseStorageService.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      return null;
    }
  }

  /**
   * Compress an image before uploading
   */
  private async compressImage(uri: string): Promise<{ uri: string }> {
    try {
      const result = await manipulateAsync(
        uri,
        [
          {
            resize: {
              width: this.MAX_IMAGE_DIMENSION,
            },
          },
        ],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
        }
      );

      return result;
    } catch (error) {
      console.error('Failed to compress image:', error);
      // Return original if compression fails
      return { uri };
    }
  }

  /**
   * Check if mime type is an image
   */
  private isImage(mimeType?: string): boolean {
    if (!mimeType) return false;
    return mimeType.startsWith('image/');
  }

  /**
   * Get file extension from URI or mime type
   */
  private getFileExtension(uri: string, mimeType?: string): string {
    // Try to get from URI
    const uriParts = uri.split('.');
    if (uriParts.length > 1) {
      const ext = uriParts[uriParts.length - 1].toLowerCase();
      if (ext.length <= 4) {
        return `.${ext}`;
      }
    }

    // Fallback to mime type
    if (mimeType) {
      const mimeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
        'text/plain': '.txt',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
      };

      return mimeMap[mimeType] || '.bin';
    }

    return '.bin';
  }
}

// Export singleton instance
export const attachmentService = new AttachmentService();