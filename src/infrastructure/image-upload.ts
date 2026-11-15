// Shrinks a photo with a canvas and uploads it (ADR-012). The server refuses anything over 1 MB or
// of another type, so the shrinking is what keeps a phone photo under the cap.
import type { ApiError } from '../application/api-contract';
import type { ImageUploader } from '../application/ports';

export const MAX_SIDE = 1600;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.8;

/** The size after fitting the longest side into `MAX_SIDE`, never enlarging. */
export function fittedSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function shrink(file: Blob): Promise<{ blob: Blob; width: number; height: number } | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const { width, height } = fittedSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  // A browser without WebP encoding returns PNG here, so the type is checked.
  const webp = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
  const blob = webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  return blob ? { blob, width, height } : null;
}

export function imageUploader(): ImageUploader {
  return {
    upload: async (file, options) => {
      const shrunk = await shrink(file);
      if (!shrunk) return { ok: false, error: 'invalid' };
      const headers: Record<string, string> = {
        'Content-Type': shrunk.blob.type,
        'X-Image-Width': String(shrunk.width),
        'X-Image-Height': String(shrunk.height),
      };
      if (options?.system) headers['X-Image-System'] = '1';
      let response: Response;
      try {
        response = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', headers, body: shrunk.blob });
      } catch {
        return { ok: false, error: 'unavailable' };
      }
      const payload = (await response.json().catch(() => ({}))) as { id?: string; error?: ApiError };
      if (response.ok && payload.id) return { ok: true, value: { id: payload.id, width: shrunk.width, height: shrunk.height } };
      return { ok: false, error: payload.error ?? 'unavailable' };
    },
  };
}
