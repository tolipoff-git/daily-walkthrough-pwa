/**
 * Compress an image file using HTML5 Canvas to max dimension 1600px and JPEG quality 0.82
 * to provide high-clarity inspection evidence while keeping memory safe.
 *
 * Memory-safe path: prefers createImageBitmap with native downscale-on-decode
 * (no giant base64 intermediate, no full-resolution <img> decode), which is
 * critical on low-RAM phones where the FileReader + Image path could eat
 * hundreds of MB per photo and freeze the device.
 */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<string> {
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
  // Single scaled decode. Passing only ONE resize dimension lets the decoder
  // preserve aspect ratio and (for JPEG) downscale DURING decode via DCT
  // scaling — no full-resolution bitmap is ever allocated (a 50 MP photo
  // would otherwise need ~200 MB of RGBA and can OOM/reboot a phone).
  // NOTE: never "probe" with createImageBitmap(file) without resize options —
  // that IS a full-res decode.
  let bitmap = await createImageBitmap(file, {
    resizeWidth: maxDimension,
    resizeQuality: 'medium', // 'high' can force a GPU scaling path that hangs buggy mobile drivers
    imageOrientation: 'from-image',
  });

  // Portrait shots: a width-constrained decode can leave height above the cap
  if (bitmap.height > maxDimension) {
    bitmap.close();
    bitmap = await createImageBitmap(file, {
      resizeHeight: maxDimension,
      resizeQuality: 'medium',
      imageOrientation: 'from-image',
    });
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create 2D canvas context');

    ctx.drawImage(bitmap, 0, 0);
    drawWatermark(ctx, canvas.width, canvas.height);
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
        drawWatermark(ctx, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const baseDim = Math.min(width, height);
  const fontSize = Math.max(12, Math.round(baseDim * 0.022));
  const paddingX = Math.max(8, Math.round(fontSize * 0.6));
  const paddingY = Math.max(4, Math.round(fontSize * 0.35));
  const margin = Math.max(8, Math.round(baseDim * 0.015));
  const text = `EHS ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  ctx.save();
  ctx.font = `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  const textMetrics = ctx.measureText(text);
  const boxWidth = textMetrics.width + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const boxX = margin;
  const boxY = height - margin - boxHeight;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, Math.max(3, Math.round(fontSize * 0.25)));
    ctx.fill();
  } else {
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  }

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2);
  ctx.restore();
}

/**
 * Capture the current frame of a getUserMedia <video> element as a compressed
 * JPEG data URL (max 1600px). Used by the in-app camera so we never hand off
 * to the native camera app (which crashes some phones at the driver level).
 */
export function captureVideoFrame(video: HTMLVideoElement, maxDimension = 1600, quality = 0.82): string {
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (!srcW || !srcH) {
    throw new Error('Video stream is not ready');
  }

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  ctx.drawImage(video, 0, 0, width, height);
  drawWatermark(ctx, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}
