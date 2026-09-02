/**
 * Compress an image file using HTML5 Canvas to max dimension 1024px and JPEG quality 0.75
 * to prevent localStorage/IndexedDB quota overflow.
 *
 * Memory-safe path: prefers createImageBitmap with native downscale-on-decode
 * (no giant base64 intermediate, no full-resolution <img> decode), which is
 * critical on low-RAM phones where the FileReader + Image path could eat
 * hundreds of MB per photo and freeze the device.
 */
export async function compressImage(file: File, maxDimension = 1024, quality = 0.75): Promise<string> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await compressViaBitmap(file, maxDimension, quality);
    } catch (err) {
      console.warn('createImageBitmap path failed, falling back to Image decode:', err);
    }
  }
  return compressViaImageElement(file, maxDimension, quality);
}

async function compressViaBitmap(file: File, maxDimension: number, quality: number): Promise<string> {
  // Probe dimensions first (transient decode), then re-decode with native resize
  const probe = await createImageBitmap(file);
  const srcW = probe.width;
  const srcH = probe.height;
  probe.close();

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const bitmap = await createImageBitmap(file, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'high',
    imageOrientation: 'from-image',
  });

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create 2D canvas context');

    ctx.drawImage(bitmap, 0, 0, width, height);
    drawWatermark(ctx, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close();
  }
}

// Fallback for browsers without createImageBitmap (older Safari)
function compressViaImageElement(file: File, maxDimension: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create 2D canvas context'));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        drawWatermark(ctx, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D, height: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(8, height - 24, 180, 20);
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`EHS ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, 14, height - 10);
}
