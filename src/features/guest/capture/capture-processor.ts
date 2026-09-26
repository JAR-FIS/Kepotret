export const MAX_CAPTURE_BYTES = 700_000;

/** Re-rasterizes a live camera blob to strip metadata and emits bounded JPEG. */
export async function processCapture(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement('canvas');
    const width = bitmap.width;
    const height = bitmap.height;
    for (let scale = 1; scale >= 0.35; scale *= 0.82) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Image processing is unavailable.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (let quality = 0.9; quality >= 0.45; quality -= 0.1) {
        const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (output && output.type === 'image/jpeg' && output.size <= MAX_CAPTURE_BYTES) {
          canvas.width = 0;
          canvas.height = 0;
          return output;
        }
      }
    }
    canvas.width = 0;
    canvas.height = 0;
    throw new Error('The photo could not be reduced to the allowed size.');
  } finally {
    bitmap.close();
  }
}
