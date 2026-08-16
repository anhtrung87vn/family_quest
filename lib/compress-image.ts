/**
 * Client-side image compression utility.
 * Resizes to MAX_DIM and iteratively reduces JPEG quality until file < TARGET_BYTES.
 */

const MAX_DIM = 1600;
const TARGET_BYTES = 900_000; // ~900 KB — safely under 1 MB
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.1;

export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    // Already small enough — skip
    if (file.size <= TARGET_BYTES) { resolve(file); return; }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Scale down if needed
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try quality levels until under TARGET_BYTES
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }

            if (blob.size <= TARGET_BYTES || quality <= MIN_QUALITY) {
              // Use compressed if smaller than original, else original
              if (blob.size < file.size) {
                resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
              } else {
                resolve(file);
              }
            } else {
              // Try lower quality
              tryQuality(Math.max(quality - QUALITY_STEP, MIN_QUALITY));
            }
          },
          "image/jpeg",
          quality,
        );
      };

      tryQuality(INITIAL_QUALITY);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
