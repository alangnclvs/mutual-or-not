/**
 * The profile photo as a small square JPEG data URL, made on the device so the analysis stays a few
 * kilobytes. Null when the browser cannot decode the image (HEIC on most browsers). Checked by eye.
 */
export async function thumbnail(
  bytes: Uint8Array,
  type: string,
  size = 128,
): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type }));
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context || side === 0) return null;
    const x = (bitmap.width - side) / 2;
    const y = (bitmap.height - side) / 2;
    context.drawImage(bitmap, x, y, side, side, 0, 0, size, size);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}
