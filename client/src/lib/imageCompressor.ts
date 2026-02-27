/**
 * Image compression utility using the browser Canvas API.
 * No external dependencies required.
 */

export interface CompressOptions {
  /** Maximum width or height in pixels. Aspect ratio is preserved. Default: 1200 */
  maxDimension?: number;
  /** JPEG quality between 0 and 1. Default: 0.82 */
  quality?: number;
  /** Output MIME type. Default: "image/jpeg" */
  outputType?: "image/jpeg" | "image/webp";
}

export interface CompressResult {
  /** Compressed file ready for upload */
  file: File;
  /** Base64 data URL of the compressed image */
  dataUrl: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio as a percentage (e.g. 65 means 65% smaller) */
  savingsPercent: number;
  /** Width of the output image */
  width: number;
  /** Height of the output image */
  height: number;
}

/**
 * Compress an image File using Canvas API.
 * Resizes to maxDimension and encodes as JPEG/WebP.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxDimension = 1200,
    quality = 0.82,
    outputType = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      // Draw onto canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available"));
        return;
      }

      // White background for JPEG (transparent areas become white)
      if (outputType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export as data URL
      const dataUrl = canvas.toDataURL(outputType, quality);

      // Convert data URL to File
      const base64 = dataUrl.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const ext = outputType === "image/webp" ? "webp" : "jpg";
      const compressedFile = new File(
        [bytes],
        file.name.replace(/\.[^.]+$/, `.${ext}`),
        { type: outputType }
      );

      const originalSize = file.size;
      const compressedSize = compressedFile.size;
      const savingsPercent =
        originalSize > 0
          ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
          : 0;

      resolve({
        file: compressedFile,
        dataUrl,
        originalSize,
        compressedSize,
        savingsPercent,
        width,
        height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

/** Format bytes to human-readable string (e.g. "1.2 MB") */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
