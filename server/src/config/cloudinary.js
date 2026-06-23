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

export { cloudinaryEnabled };
