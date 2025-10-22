import { useState, useCallback, useEffect } from 'react';
import { Image } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  uploadListingImage,
  uploadMultipleImages,
  deleteListingImage,
  prefetchImages,
  cacheImage,
} from '../services/storage.service';
import { supabase } from '../lib/supabase';

interface UseListingImagesOptions {
  listingId: string;
  maxImages?: number;
  onUploadProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

interface ImageItem {
  id: string;
  url: string;
  path?: string;
  isUploading?: boolean;
  error?: string;
}

export function useListingImages({
  listingId,
  maxImages = 12,
  onUploadProgress,
  onError,
}: UseListingImagesOptions) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Load existing images
  useEffect(() => {
    loadExistingImages();
  }, [listingId]);

  // Load images from database
  const loadExistingImages = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('images')
        .eq('id', listingId)
        .single();

      if (error) {
        console.error('Load images error:', error);
        return;
      }

      if (data?.images) {
        const imageItems: ImageItem[] = data.images.map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
        }));
        setImages(imageItems);

        // Prefetch images for better performance
        prefetchImages(data.images);
      }
    } catch (error) {
      console.error('Load images error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  // Upload single image mutation
  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      return uploadListingImage(uri, listingId, { resize: 'full' });
    },
    onSuccess: (result, uri) => {
      if (result.success && result.url) {
        const newImage: ImageItem = {
          id: Date.now().toString(),
          url: result.url,
          path: result.path,
        };
        setImages(prev => [...prev, newImage]);
        updateListingImages([...images, newImage]);
      } else {
        onError?.(result.error || 'Upload failed');
      }
    },
    onError: (error) => {
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    },
  });

  // Update listing images in database
  const updateListingImages = useCallback(async (updatedImages: ImageItem[]) => {
    try {
      const imageUrls = updatedImages.map(img => img.url);

      const { error } = await supabase
        .from('listings')
        .update({ images: imageUrls })
        .eq('id', listingId);

      if (error) {
        console.error('Update listing images error:', error);
      } else {
        // Invalidate listing cache
        queryClient.invalidateQueries({ queryKey: ['listings', 'detail', listingId] });
      }
    } catch (error) {
      console.error('Update listing images error:', error);
    }
  }, [listingId, queryClient]);

  // Pick image from library
  const pickImage = useCallback(async () => {
    if (images.length >= maxImages) {
      onError?.(`Maximum ${maxImages} images allowed`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map(asset => asset.uri);
      uploadMultipleImagesWithProgress(uris);
    }
  }, [images.length, maxImages, onError]);

  // Take photo with camera
  const takePhoto = useCallback(async () => {
    if (images.length >= maxImages) {
      onError?.(`Maximum ${maxImages} images allowed`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      onError?.('Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  }, [images.length, maxImages, onError, uploadMutation]);

  // Upload multiple images with progress
  const uploadMultipleImagesWithProgress = useCallback(async (uris: string[]) => {
    setIsLoading(true);

    try {
      const results = await uploadMultipleImages(
        uris,
        listingId,
        (progress) => onUploadProgress?.(progress)
      );

      const newImages: ImageItem[] = results
        .filter(r => r.success && r.url)
        .map((r, index) => ({
          id: `new-${Date.now()}-${index}`,
          url: r.url!,
          path: r.path,
        }));

      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        updateListingImages(updatedImages);
      }

      // Report any errors
      const errors = results.filter(r => !r.success);
      if (errors.length > 0) {
        onError?.(`${errors.length} image(s) failed to upload`);
      }
    } catch (error) {
      console.error('Upload multiple images error:', error);
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsLoading(false);
      onUploadProgress?.(0);
    }
  }, [images, listingId, onUploadProgress, onError, updateListingImages]);

  // Delete image
  const deleteImage = useCallback(async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    try {
      // Remove from state immediately for better UX
      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);

      // Delete from storage if it has a path
      if (image.path) {
        await deleteListingImage(image.path);
      }

      // Update database
      updateListingImages(updatedImages);
    } catch (error) {
      console.error('Delete image error:', error);
      // Restore image on error
      setImages(images);
      onError?.('Failed to delete image');
    }
  }, [images, updateListingImages, onError]);

  // Reorder images
  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    setImages(updatedImages);
    updateListingImages(updatedImages);
  }, [images, updateListingImages]);

  // Set cover image (first image)
  const setCoverImage = useCallback((imageId: string) => {
    const imageIndex = images.findIndex(img => img.id === imageId);
    if (imageIndex > 0) {
      reorderImages(imageIndex, 0);
    }
  }, [images, reorderImages]);

  // Cache images for offline viewing
  const cacheAllImages = useCallback(async () => {
    const urls = images.map(img => img.url);
    await Promise.all(urls.map(url => cacheImage(url)));
  }, [images]);

  // Validate image before upload
  const validateImage = useCallback(async (uri: string): Promise<boolean> => {
    try {
      // Get image dimensions
      await new Promise((resolve, reject) => {
        Image.getSize(
          uri,
          (width, height) => {
            if (width < 300 || height < 300) {
              reject(new Error('Image must be at least 300x300 pixels'));
            } else {
              resolve({ width, height });
            }
          },
          reject
        );
      });

      return true;
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Invalid image');
      return false;
    }
  }, [onError]);

  return {
    images,
    isLoading,
    isUploading: uploadMutation.isPending,
    pickImage,
    takePhoto,
    deleteImage,
    reorderImages,
    setCoverImage,
    cacheAllImages,
    validateImage,
    refresh: loadExistingImages,
    canAddMore: images.length < maxImages,
    remainingSlots: maxImages - images.length,
  };
}