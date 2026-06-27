import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { cloudinaryEnabled } from './config/cloudinary.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import listingRoutes from './routes/listing.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import orderRoutes from './routes/order.routes.js';
import messageRoutes from './routes/message.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import reviewRoutes from './routes/review.routes.js';
import scanRoutes from './routes/scan.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Allow the configured origins plus any localhost / private-LAN dev origin
  // (so the Expo web preview and devices on the LAN work). Requests with no
  // Origin (native apps, curl) are always allowed.
  const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.clientOrigins.includes(origin) || devOrigin.test(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', cloudinary: cloudinaryEnabled });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/disputes', disputeRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
