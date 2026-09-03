// Reads an image File, scales it to fit within `maxSize` px on its longest edge,
// and returns a compressed JPEG data URL. Keeps photos small enough to store
// inline with a plushie's Steckbrief (no upload backend needed).
export async function resizeImageToDataUrl(
  file: File,
  maxSize = 512,
  quality = 0.82,
): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // Without a 2D context there is no way to shrink the picture. Returning the
  // untouched original would just push a multi-megabyte data URL at the server,
  // which rejects it — fail here instead, where the caller shows a message.
  if (!ctx) throw new Error('Bild konnte nicht verkleinert werden');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    img.src = src;
  });
}
