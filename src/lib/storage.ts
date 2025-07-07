import { supabase } from './supabase';
import { ImageProcessingResult } from './image-processor';
import crypto from 'crypto';

// Storage 설정
export const STORAGE_CONFIG = {
  bucketName: 'meal-images',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  uploadTimeout: 30000, // 30초
  retryAttempts: 3
};

// 파일 경로 구조 타입
export interface StoragePathConfig {
  userId: string;
  mealId: string;
  imageType: 'original' | 'thumbnail' | 'analysis';
  format: 'webp' | 'jpeg';
}

// 업로드 결과 타입
export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  path?: string;
  error?: string;
  size?: number;
  uploadTime?: number;
}

// 다중 업로드 결과 타입
export interface MultiUploadResult {
  success: boolean;
  results: {
    original?: UploadResult;
    thumbnail?: UploadResult;
    analysis?: UploadResult;
  };
  totalSize: number;
  totalUploadTime: number;
  error?: string;
}

/**
 * Storage 파일 경로 생성
 */
export function generateStoragePath(config: StoragePathConfig): string {
  const { userId, mealId, imageType, format } = config;
  return `users/${userId}/meals/${mealId}/${imageType}.${format}`;
}

/**
 * 고유한 meal ID 생성
 */
export function generateMealId(): string {
  return crypto.randomUUID();
}

/**
 * Storage bucket 초기화 및 정책 설정
 */
export async function initializeStorageBucket(): Promise<{ success: boolean; error?: string }> {
  try {
    // 버킷 존재 확인
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Failed to list buckets:', listError);
      return { success: false, error: listError.message };
    }

    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_CONFIG.bucketName);

    if (!bucketExists) {
      // 버킷 생성
      const { error: createError } = await supabase.storage.createBucket(STORAGE_CONFIG.bucketName, {
        public: false, // 인증된 사용자만 접근 가능
        allowedMimeTypes: STORAGE_CONFIG.allowedMimeTypes,
        fileSizeLimit: STORAGE_CONFIG.maxFileSize
      });

      if (createError) {
        console.error('Failed to create bucket:', createError);
        return { success: false, error: createError.message };
      }

      console.log(`Storage bucket '${STORAGE_CONFIG.bucketName}' created successfully`);
    } else {
      console.log(`Storage bucket '${STORAGE_CONFIG.bucketName}' already exists`);
    }

    return { success: true };
  } catch (error) {
    console.error('Storage initialization error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 단일 이미지 업로드
 */
export async function uploadImage(
  buffer: Buffer,
  path: string,
  mimeType: string,
  retryCount: number = 0
): Promise<UploadResult> {
  const startTime = Date.now();
  
  try {
    // 파일 크기 체크
    if (buffer.length > STORAGE_CONFIG.maxFileSize) {
      return {
        success: false,
        error: `파일 크기가 너무 큽니다. 최대 ${STORAGE_CONFIG.maxFileSize / 1024 / 1024}MB까지 허용됩니다.`
      };
    }

    // MIME 타입 검증
    if (!STORAGE_CONFIG.allowedMimeTypes.includes(mimeType)) {
      return {
        success: false,
        error: `지원되지 않는 파일 형식입니다. 허용되는 형식: ${STORAGE_CONFIG.allowedMimeTypes.join(', ')}`
      };
    }

    // 업로드 수행
    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .upload(path, buffer, {
        cacheControl: '3600',
        upsert: true, // 같은 경로에 있는 파일 덮어쓰기
        contentType: mimeType
      });

    if (error) {
      throw new Error(error.message);
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .getPublicUrl(path);

    const uploadTime = Date.now() - startTime;

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      path: path,
      size: buffer.length,
      uploadTime
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 재시도 로직
    if (retryCount < STORAGE_CONFIG.retryAttempts) {
      console.log(`Retrying upload (${retryCount + 1}/${STORAGE_CONFIG.retryAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 점진적 백오프
      return uploadImage(buffer, path, mimeType, retryCount + 1);
    }

    return {
      success: false,
      error: `업로드 실패: ${errorMessage}`,
      uploadTime: Date.now() - startTime
    };
  }
}

/**
 * 처리된 이미지들을 모두 업로드
 */
export async function uploadProcessedImages(
  processedImages: ImageProcessingResult,
  userId: string,
  mealId?: string
): Promise<MultiUploadResult> {
  const startTime = Date.now();
  const actualMealId = mealId || generateMealId();
  const results: MultiUploadResult['results'] = {};
  let totalSize = 0;
  let hasError = false;
  let errorMessage = '';

  try {
    // 병렬 업로드 수행
    const uploadPromises = [];

    // Original 이미지 업로드
    if (processedImages.archive?.buffer) {
      const path = generateStoragePath({
        userId,
        mealId: actualMealId,
        imageType: 'original',
        format: 'webp'
      });
      
      uploadPromises.push(
        uploadImage(
          processedImages.archive.buffer,
          path,
          `image/${processedImages.archive.format}`
        ).then(result => {
          results.original = result;
          if (result.success && result.size) {
            totalSize += result.size;
          }
          if (!result.success) {
            hasError = true;
            errorMessage = result.error || 'Original 업로드 실패';
          }
        })
      );
    }

    // Thumbnail 이미지 업로드
    if (processedImages.thumbnail?.buffer) {
      const path = generateStoragePath({
        userId,
        mealId: actualMealId,
        imageType: 'thumbnail',
        format: 'webp'
      });
      
      uploadPromises.push(
        uploadImage(
          processedImages.thumbnail.buffer,
          path,
          `image/${processedImages.thumbnail.format}`
        ).then(result => {
          results.thumbnail = result;
          if (result.success && result.size) {
            totalSize += result.size;
          }
          if (!result.success) {
            hasError = true;
            errorMessage = result.error || 'Thumbnail 업로드 실패';
          }
        })
      );
    }

    // Analysis 이미지 업로드
    if (processedImages.analysis?.buffer) {
      const path = generateStoragePath({
        userId,
        mealId: actualMealId,
        imageType: 'analysis',
        format: 'jpeg'
      });
      
      uploadPromises.push(
        uploadImage(
          processedImages.analysis.buffer,
          path,
          `image/${processedImages.analysis.format}`
        ).then(result => {
          results.analysis = result;
          if (result.success && result.size) {
            totalSize += result.size;
          }
          if (!result.success) {
            hasError = true;
            errorMessage = result.error || 'Analysis 업로드 실패';
          }
        })
      );
    }

    // 모든 업로드 완료 대기
    await Promise.all(uploadPromises);

    const totalUploadTime = Date.now() - startTime;

    return {
      success: !hasError,
      results,
      totalSize,
      totalUploadTime,
      error: hasError ? errorMessage : undefined
    };

  } catch (error) {
    const totalUploadTime = Date.now() - startTime;
    
    return {
      success: false,
      results,
      totalSize,
      totalUploadTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 이미지 삭제
 */
export async function deleteImage(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .remove([path]);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 사용자의 모든 meal 이미지 삭제
 */
export async function deleteUserMealImages(
  userId: string,
  mealId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const paths = [
      generateStoragePath({ userId, mealId, imageType: 'original', format: 'webp' }),
      generateStoragePath({ userId, mealId, imageType: 'thumbnail', format: 'webp' }),
      generateStoragePath({ userId, mealId, imageType: 'analysis', format: 'jpeg' })
    ];

    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .remove(paths);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 이미지 다운로드
 */
export async function downloadImage(path: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .download(path);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 사용자의 storage 사용량 확인
 */
export async function getUserStorageUsage(userId: string): Promise<{
  success: boolean;
  usage?: {
    totalFiles: number;
    totalSize: number;
    formattedSize: string;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .list(`users/${userId}/meals`, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw new Error(error.message);
    }

    let totalFiles = 0;
    let totalSize = 0;

    if (data) {
      const getAllFiles = async (path: string): Promise<void> => {
        const { data: files, error } = await supabase.storage
          .from(STORAGE_CONFIG.bucketName)
          .list(path, { limit: 1000 });

        if (error) throw new Error(error.message);

        for (const file of files || []) {
          if (file.metadata?.size) {
            totalFiles++;
            totalSize += file.metadata.size;
          }
        }
      };

      for (const folder of data) {
        if (folder.name) {
          await getAllFiles(`users/${userId}/meals/${folder.name}`);
        }
      }
    }

    const formattedSize = formatBytes(totalSize);

    return {
      success: true,
      usage: {
        totalFiles,
        totalSize,
        formattedSize
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 바이트를 읽기 쉬운 형태로 변환
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Storage 연결 상태 확인
 */
export async function checkStorageConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw new Error(error.message);
    }

    const bucketExists = data?.some(bucket => bucket.name === STORAGE_CONFIG.bucketName);
    
    if (!bucketExists) {
      return { success: false, error: 'Storage bucket not found' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 