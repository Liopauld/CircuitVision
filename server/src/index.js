import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { cloudinaryEnabled } from './config/cloudinary.js';
import { createApp } from './app.js';

async function start() {
  try {
    await connectDb();
    const app = createApp();
    app.listen(env.port, () => {
      console.log(`[server] listening on http://localhost:${env.port}`);
      if (!cloudinaryEnabled) {
        console.warn(
          '[server] Cloudinary not configured — image uploads will use a placeholder URL.'
        );
      }
    });
  } catch (err) {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
}

start();
