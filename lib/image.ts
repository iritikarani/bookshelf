/** Resize a photo to ~300px wide and re-encode as JPEG. Returns a Blob and a data URL. */
export async function compressCover(file: File, targetWidth = 300, quality = 0.82): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file doesn't look like an image."));
      i.src = bitmapUrl;
    });
    const scale = Math.min(1, targetWidth / img.naturalWidth);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't compress the image."))), "image/jpeg", quality),
    );
    return { blob, dataUrl: canvas.toDataURL("image/jpeg", quality) };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
