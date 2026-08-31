/**
 * Compress an image file using HTML5 Canvas to max dimension 1024px and JPEG quality 0.75
 * to prevent localStorage/IndexedDB quota overflow.
 */
export async function compressImage(file: File, maxDimension = 1024, quality = 0.75): Promise<string> {
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

        // Add small timestamp watermark in corner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(8, height - 24, 180, 20);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`EHS ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, 14, height - 10);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
