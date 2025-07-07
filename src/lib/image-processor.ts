import sharp from 'sharp';
import crypto from 'crypto';

// 이미지 처리 설정
export interface ImageProcessingConfig {
  // 분석용 이미지 설정
  analysis: {
    width: number;
    height: number;
    quality: number;
    format: 'jpeg' | 'webp';
  };
  // 썸네일 설정
  thumbnail: {
    width: number;
    height: number;
    quality: number;
    format: 'webp';
  };
  // 원본 보관용 설정
  archive: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'webp';
  };
}

// 기본 설정
export const DEFAULT_IMAGE_CONFIG: ImageProcessingConfig = {
  analysis: {
    width: 1024,
    height: 1024,
    quality: 95, // AI 분석을 위해 높은 품질 유지
    format: 'jpeg' // Gemini API 호환성
  },
  thumbnail: {
    width: 300,
    height: 300,
    quality: 80, // 빠른 로딩을 위한 최적화
    format: 'webp' // 최적 압축률
  },
  archive: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85, // 저장용 균형점
    format: 'webp' // 저장 공간 효율성
  }
};

// 처리된 이미지 결과 타입
export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number; // bytes
  base64?: string; // API 전송용
}

// 이미지 처리 결과 타입
export interface ImageProcessingResult {
  analysis: ProcessedImage;
  thumbnail: ProcessedImage;
  archive: ProcessedImage;
  originalHash: string;
  processingTime: number;
}

// 이미지 메타데이터 타입
export interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  channels: number;
  density: number;
  hasAlpha: boolean;
  isAnimated: boolean;
  size: number;
}

// 간단한 메모리 캐시 (프로덕션에서는 Redis 등 사용 권장)
class ImageCache {
  private cache = new Map<string, ImageProcessingResult>();
  private readonly maxSize = 50; // 최대 50개 이미지 캐시
  private readonly maxAge = 1000 * 60 * 60; // 1시간

  set(key: string, value: ImageProcessingResult): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // 타임스탬프 추가
    const timestampedValue = {
      ...value,
      cachedAt: Date.now()
    };

    this.cache.set(key, timestampedValue as ImageProcessingResult);
  }

  get(key: string): ImageProcessingResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 만료 시간 체크
    const cachedValue = cached as ImageProcessingResult & { cachedAt: number };
    if (Date.now() - cachedValue.cachedAt > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  generateKey(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// 전역 캐시 인스턴스
const imageCache = new ImageCache();

/**
 * 이미지 메타데이터 추출
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(buffer).metadata();
    
    return {
      format: metadata.format || 'unknown',
      width: metadata.width || 0,
      height: metadata.height || 0,
      channels: metadata.channels || 0,
      density: metadata.density || 72,
      hasAlpha: metadata.hasAlpha || false,
      isAnimated: metadata.pages ? metadata.pages > 1 : false,
      size: buffer.length
    };
  } catch (error) {
    throw new Error(`Failed to extract image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 이미지 품질 검증 및 향상
 */
async function enhanceImageQuality(sharpInstance: sharp.Sharp): Promise<sharp.Sharp> {
  return sharpInstance
    // 선명도 향상 (음식 인식률 개선)
    .sharpen({
      sigma: 0.5,
      m1: 1.0,
      m2: 2.0,
      x1: 2.0,
      y2: 10.0,
      y3: 20.0
    })
    // 자동 색상 밸런스 (음식 색상 보존)
    .normalize()
    // 노이즈 제거
    .median(1);
}

/**
 * 분석용 이미지 처리 (Gemini API 최적화)
 */
async function processForAnalysis(
  buffer: Buffer, 
  config: ImageProcessingConfig['analysis']
): Promise<ProcessedImage> {
  const startTime = Date.now();
  
  let sharpInstance = sharp(buffer)
    .resize(config.width, config.height, {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // 흰색 배경
    });

  // 이미지 품질 향상
  sharpInstance = await enhanceImageQuality(sharpInstance);

  // 포맷에 따른 최적화
  if (config.format === 'jpeg') {
    sharpInstance = sharpInstance.jpeg({
      quality: config.quality,
      progressive: true,
      mozjpeg: true // 더 나은 압축 알고리즘
    });
  } else if (config.format === 'webp') {
    sharpInstance = sharpInstance.webp({
      quality: config.quality,
      effort: 6, // 최대 압축 노력
      smartSubsample: true
    });
  }

  const processedBuffer = await sharpInstance.toBuffer();
  const metadata = await sharp(processedBuffer).metadata();

  // Base64 인코딩 (API 전송용)
  const base64 = processedBuffer.toString('base64');

  console.log(`Analysis image processed in ${Date.now() - startTime}ms`);

  return {
    buffer: processedBuffer,
    format: config.format,
    width: metadata.width || config.width,
    height: metadata.height || config.height,
    size: processedBuffer.length,
    base64
  };
}

/**
 * 썸네일 이미지 처리 (빠른 로딩용)
 */
async function processForThumbnail(
  buffer: Buffer,
  config: ImageProcessingConfig['thumbnail']
): Promise<ProcessedImage> {
  const processedBuffer = await sharp(buffer)
    .resize(config.width, config.height, {
      fit: 'cover', // 썸네일은 정사각형으로 크롭
      position: 'centre'
    })
    .webp({
      quality: config.quality,
      effort: 4, // 빠른 처리를 위해 노력 수준 조정
      smartSubsample: true
    })
    .toBuffer();

  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    format: config.format,
    width: metadata.width || config.width,
    height: metadata.height || config.height,
    size: processedBuffer.length
  };
}

/**
 * 아카이브용 이미지 처리 (저장 최적화)
 */
async function processForArchive(
  buffer: Buffer,
  config: ImageProcessingConfig['archive']
): Promise<ProcessedImage> {
  const processedBuffer = await sharp(buffer)
    .resize(config.maxWidth, config.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: config.quality,
      effort: 6,
      smartSubsample: true,
      lossless: false
    })
    .toBuffer();

  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    format: config.format,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: processedBuffer.length
  };
}

/**
 * 메인 이미지 처리 함수
 */
export async function processImageForAI(
  buffer: Buffer,
  config: ImageProcessingConfig = DEFAULT_IMAGE_CONFIG
): Promise<ImageProcessingResult> {
  const startTime = Date.now();
  
  try {
    // 입력 이미지 검증
    const metadata = await getImageMetadata(buffer);
    
    if (metadata.width === 0 || metadata.height === 0) {
      throw new Error('Invalid image dimensions');
    }

    // 캐시 확인
    const cacheKey = imageCache.generateKey(buffer);
    const cached = imageCache.get(cacheKey);
    if (cached) {
      console.log(`Image loaded from cache: ${cacheKey}`);
      return cached;
    }

    // 병렬 처리로 성능 최적화
    const [analysis, thumbnail, archive] = await Promise.all([
      processForAnalysis(buffer, config.analysis),
      processForThumbnail(buffer, config.thumbnail),
      processForArchive(buffer, config.archive)
    ]);

    const result: ImageProcessingResult = {
      analysis,
      thumbnail,
      archive,
      originalHash: cacheKey,
      processingTime: Date.now() - startTime
    };

    // 캐시에 저장
    imageCache.set(cacheKey, result);

    console.log(`Image processing completed in ${result.processingTime}ms`);
    console.log(`Sizes - Original: ${metadata.size}b, Analysis: ${analysis.size}b, Thumbnail: ${thumbnail.size}b, Archive: ${archive.size}b`);
    
    return result;

  } catch (error) {
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 이미지 형식 검증
 */
export function validateImageFormat(buffer: Buffer, allowedFormats: string[] = ['jpeg', 'jpg', 'png', 'webp']): boolean {
  try {
    // 파일 시그니처 체크
    const signatures = {
      jpeg: [0xFF, 0xD8, 0xFF],
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      webp: [0x52, 0x49, 0x46, 0x46] // RIFF (WebP의 시작)
    };

    for (const format of allowedFormats) {
      const signature = signatures[format as keyof typeof signatures];
      if (signature && buffer.subarray(0, signature.length).every((byte, index) => byte === signature[index])) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 이미지 크기 검증
 */
export function validateImageSize(buffer: Buffer, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  return buffer.length <= maxSizeBytes;
}

/**
 * 손상된 이미지 검사
 */
export async function validateImageIntegrity(buffer: Buffer): Promise<boolean> {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
}

/**
 * 캐시 관리 함수들
 */
export const cacheManager = {
  getStats: () => imageCache.getStats(),
  clear: () => imageCache.clear(),
  generateKey: (buffer: Buffer) => imageCache.generateKey(buffer)
};

/**
 * 이미지 압축률 계산
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return ((originalSize - compressedSize) / originalSize) * 100;
}

/**
 * 메모리 사용량 모니터링
 */
export function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
} 