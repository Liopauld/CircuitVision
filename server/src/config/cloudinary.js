import { v2 as cloudinary } from 'cloudinary';
import { env, cloudinaryEnabled } from './env.js';

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

/**
 * Upload a single in-memory image buffer to Cloudinary and resolve with its
 * secure URL. When Cloudinary credentials are not configured we return a
 * deterministic placeholder so local development still works.
 *
 * @param {Buffer} buffer  raw image bytes (from multer memory storage)
 * @param {string} folder  Cloudinary folder to organize uploads
 * @returns {Promise<string>} the secure image URL
 */
export function uploadImageBuffer(buffer, folder = 'circuitvision/listings') {
  if (!cloudinaryEnabled) {
    return Promise.resolve(
      `https://placehold.co/600x400?text=CircuitVision+%28no+Cloudinary%29`
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Derive the Cloudinary public_id from a stored secure_url. Strips the
// `/upload/`, an optional version segment (`v123456/`), and the extension:
//   https://res.cloudinary.com/x/image/upload/v17/circuitvision/listings/ab.jpg
//   -> circuitvision/listings/ab
function publicIdFromUrl(url) {
  const m = String(url).match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return m ? m[1] : null;
}

/**
 * Best-effort delete of uploaded images by their stored URLs. No-op when
 * Cloudinary isn't configured (URLs are placeholders) or a URL isn't a
 * Cloudinary asset. Never throws — image cleanup must not fail the request.
 *
 * @param {string[]} urls
 */
export async function deleteImagesByUrl(urls = []) {
  if (!cloudinaryEnabled) return;
  await Promise.all(
    urls.map(async (url) => {
      const publicId = publicIdFromUrl(url);
      if (!publicId) return;
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch {
        /* best-effort: ignore individual failures */
      }
    })
  );
}

export { cloudinaryEnabled };
