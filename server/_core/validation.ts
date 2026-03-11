/**
 * Validation utility for file uploads
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validates that a buffer is a valid image (JPEG, PNG, or WEBP) and within size limits.
 * Throws an error if validation fails.
 */
export function validateImageBuffer(buffer: Buffer, maxSize: number = MAX_FILE_SIZE) {
  if (buffer.length > maxSize) {
    throw new Error(`File size exceeds the limit of ${maxSize / (1024 * 1024)}MB`);
  }

  if (buffer.length < 4) {
    throw new Error("Invalid file: too small to be a valid image");
  }

  // Magic bytes check
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.length >= 12 &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WEBP images are allowed.");
  }
}

/**
 * Validates that a filename has a safe extension.
 */
export function validateFileName(fileName: string) {
  const allowedExtensions = /\.(jpg|jpeg|png|webp)$/i;
  if (!allowedExtensions.test(fileName)) {
    throw new Error("Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed.");
  }
}

/**
 * Validates that a MIME type is a safe image type.
 */
export function validateMimeType(mimeType: string) {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new Error("Invalid MIME type. Only image/jpeg, image/png, and image/webp are allowed.");
  }
}
