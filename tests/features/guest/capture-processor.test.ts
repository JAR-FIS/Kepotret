import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_CAPTURE_BYTES, processCapture } from '@/features/guest/capture/capture-processor';

describe('processCapture', () => {
  beforeEach(() => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 800, close }));
    const toBlob = vi.fn((callback: BlobCallback, type?: string) => callback(new Blob([new Uint8Array([1, 2, 3])], { type })));
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob }) });
  });

  it('re-rasterizes as JPEG below the contract byte limit and closes the bitmap', async () => {
    const blob = await processCapture(new Blob(['camera']))
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeLessThanOrEqual(MAX_CAPTURE_BYTES);
  });
});
