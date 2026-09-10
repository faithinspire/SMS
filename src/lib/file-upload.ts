/**
 * File Upload Utility Functions
 * Handles image validation, compression, and storage for the SMS
 * Supports school logos, student photos, and other file uploads
 */

import { createClient } from '@/lib/supabase-client';

const supabase = createClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FileType = 'SCHOOL_LOGO' | 'STUDENT_PHOTO' | 'STAFF_PHOTO' | 'DOCUMENT' | 'ASSIGNMENT' | 'LESSON_MATERIAL';

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

export interface UploadResponse {
  success: boolean;
  file_url?: string;
  thumbnail_url?: string;
  storage_path?: string;
  file_size_bytes?: number;
  error?: string;
  message?: string;
}

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const FILE_CONFIG = {
  SCHOOL_LOGO: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    storageBucket: 'school-logos',
    compressionOptions: {
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.85,
      format: 'webp' as const,
    },
  },
  STUDENT_PHOTO: {
    maxSize: 3 * 1024 * 1024, // 3MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    storageBucket: 'student-photos',
    compressionOptions: {
      maxWidth: 300,
      maxHeight: 300,
      quality: 0.8,
      format: 'webp' as const,
    },
  },
  STAFF_PHOTO: {
    maxSize: 3 * 1024 * 1024, // 3MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    storageBucket: 'staff-photos',
    compressionOptions: {
      maxWidth: 300,
      maxHeight: 300,
      quality: 0.8,
      format: 'webp' as const,
    },
  },
  DOCUMENT: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['pdf', 'doc', 'docx'],
    storageBucket: 'documents',
    compressionOptions: undefined,
  },
  ASSIGNMENT: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['*/*'], // Allow any file type
    allowedExtensions: ['*'],
    storageBucket: 'assignments',
    compressionOptions: undefined,
  },
  LESSON_MATERIAL: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['*/*'], // Allow any file type
    allowedExtensions: ['*'],
    storageBucket: 'lesson-materials',
    compressionOptions: undefined,
  },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates file before upload
 * Checks size, type, and extension
 */
export async function validateFile(
  file: File,
  fileType: FileType
): Promise<UploadValidationResult> {
  try {
    const config = FILE_CONFIG[fileType];

    // Check file size
    if (file.size > config.maxSize) {
      const maxSizeMB = config.maxSize / (1024 * 1024);
      return {
        valid: false,
        error: `File size must not exceed ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      };
    }

    // Check MIME type
    if (config.allowedTypes[0] !== '*/*' && !config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`,
      };
    }

    // Check extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (config.allowedExtensions[0] !== '*' && !config.allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`,
      };
    }

    // Additional validation for images
    if (fileType.includes('PHOTO') || fileType === 'SCHOOL_LOGO') {
      const isValidImage = await validateImageDimensions(file, fileType);
      if (!isValidImage) {
        return {
          valid: false,
          error: 'Invalid image dimensions or corrupted image file',
        };
      }
    }

    return { valid: true, file };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Validates image dimensions
 */
async function validateImageDimensions(file: File, fileType: FileType): Promise<boolean> {
  // On server-side, skip dimension validation (it requires browser Image API)
  if (typeof document === 'undefined') {
    // Server-side: only check file size
    return file.size > 0;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Basic check: image must be at least 50x50px
          resolve(img.width >= 50 && img.height >= 50);
        };
        img.onerror = () => resolve(false);
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Image Compression & Optimization - DISABLED ON SERVER
 * These functions should not be called from server-side API routes
 * as they depend on browser APIs (document, canvas, FileReader, Image)
 * 
 * For server-side compression, use 'sharp' library (requires npm install sharp)
 */

/**
 * Compresses and optimizes image file - CLIENT SIDE ONLY
 * Returns compressed image as Blob
 * @deprecated Use on client-side only, not in server-side routes
 */
export async function compressImage(
  file: File,
  options?: ImageCompressionOptions
): Promise<Blob> {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Server-side: return original file as blob
    return file;
  }

  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate new dimensions
          const maxWidth = options?.maxWidth || 1000;
          const maxHeight = options?.maxHeight || 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          const quality = options?.quality || 0.85;
          const format = options?.format || 'webp';
          const mimeType = `image/${format}`;

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Could not compress image'));
              }
            },
            mimeType,
            quality
          );
        };
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates thumbnail from image - CLIENT SIDE ONLY
 * @deprecated Use on client-side only, not in server-side routes
 */
export async function generateThumbnail(
  file: File,
  thumbSize: number = 150
): Promise<Blob> {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Server-side: return original file as blob
    return file;
  }

  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = thumbSize;
          canvas.height = thumbSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Center crop
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          ctx.drawImage(img, x, y, size, size, 0, 0, thumbSize, thumbSize);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Could not generate thumbnail'));
              }
            },
            'image/webp',
            0.8
          );
        };
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Uploads file to Supabase Storage
 */
export async function uploadFileToStorage(
  file: Blob | File,
  fileName: string,
  bucket: string,
  schoolId: string
): Promise<{ path: string; url: string }> {
  try {
    const storagePath = `${schoolId}/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return {
      path: storagePath,
      url: urlData.publicUrl,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to upload file to storage'
    );
  }
}

/**
 * Deletes file from Supabase Storage
 */
export async function deleteFileFromStorage(
  storagePath: string,
  bucket: string
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to delete file from storage'
    );
  }
}

// ============================================================================
// DATABASE TRACKING
// ============================================================================

/**
 * Records file upload in database
 */
export async function recordFileUpload(
  schoolId: string,
  userId: string,
  fileData: {
    file_url: string;
    file_name: string;
    file_type: FileType;
    file_size_bytes: number;
    file_extension: string;
    mime_type: string;
    storage_path: string;
    thumbnail_url?: string;
    related_entity_type?: string;
    related_entity_id?: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('file_uploads')
      .insert([
        {
          school_id: schoolId,
          user_id: userId,
          ...fileData,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Database record failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to record file upload'
    );
  }
}

/**
 * Gets file upload history for an entity
 */
export async function getFileUploads(
  schoolId: string,
  fileType?: FileType,
  relatedEntityId?: string
) {
  try {
    let query = supabase
      .from('file_uploads')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_deleted', false);

    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    if (relatedEntityId) {
      query = query.eq('related_entity_id', relatedEntityId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch uploads: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get file uploads'
    );
  }
}

// ============================================================================
// COMPLETE UPLOAD WORKFLOW
// ============================================================================

/**
 * Main upload function - handles entire workflow
 * Validates → Compresses (client-side only) → Uploads → Records in DB
 */
export async function uploadFile(
  file: File,
  fileType: FileType,
  schoolId: string,
  userId: string,
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<UploadResponse> {
  try {
    // Step 1: Validate
    const validation = await validateFile(file, fileType);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    const config = FILE_CONFIG[fileType];
    let fileToUpload: File | Blob = file;
    let finalFileName = file.name;
    let compressionUsed = false;

    // Step 2: Compression is skipped on server-side
    // If compression is needed, it should be done on client-side before upload
    // For now, we'll upload original file
    if (typeof document === 'undefined') {
      // We're on server-side, skip compression
      compressionUsed = false;
    } else {
      // Client-side: Attempt compression if needed
      if (config.compressionOptions && (fileType.includes('PHOTO') || fileType === 'SCHOOL_LOGO')) {
        try {
          const compressed = await compressImage(file, config.compressionOptions);
          fileToUpload = compressed;
          compressionUsed = true;
          const ext = config.compressionOptions.format;
          finalFileName = `${file.name.split('.')[0]}.${ext}`;
        } catch (error) {
          console.warn('Compression failed, using original file:', error);
        }
      }
    }

    // Step 3: Upload to storage
    const { path: storagePath, url: fileUrl } = await uploadFileToStorage(
      fileToUpload,
      finalFileName,
      config.storageBucket,
      schoolId
    );

    // Step 4: Thumbnail generation skipped on server-side
    let thumbnailUrl: string | undefined;
    if (typeof document !== 'undefined' && (fileType.includes('PHOTO') || fileType === 'SCHOOL_LOGO')) {
      try {
        const thumbnail = await generateThumbnail(file);
        const thumbFileName = `thumb_${finalFileName}`;
        const { url: thumbUrl } = await uploadFileToStorage(
          thumbnail,
          thumbFileName,
          config.storageBucket,
          schoolId
        );
        thumbnailUrl = thumbUrl;
      } catch (error) {
        console.warn('Thumbnail generation failed:', error);
      }
    }

    // Step 5: Record in database
    const dbRecord = await recordFileUpload(schoolId, userId, {
      file_url: fileUrl,
      file_name: file.name,
      file_type: fileType,
      file_size_bytes: file.size,
      file_extension: file.name.split('.').pop() || '',
      mime_type: file.type,
      storage_path: storagePath,
      thumbnail_url: thumbnailUrl,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
    });

    return {
      success: true,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      storage_path: storagePath,
      file_size_bytes: file.size,
      message: `File uploaded successfully${compressionUsed ? ' (compressed)' : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

export default {
  validateFile,
  compressImage,
  generateThumbnail,
  uploadFile,
  uploadFileToStorage,
  deleteFileFromStorage,
  recordFileUpload,
  getFileUploads,
};
