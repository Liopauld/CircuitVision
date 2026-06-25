import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { cloudinaryEnabled } from './config/cloudinary.js';
import authRoutes from './routes/auth.routes.js';
import listingRoutes from './routes/listing.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import orderRoutes from './routes/order.routes.js';
import messageRoutes from './routes/message.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', cloudinary: cloudinaryEnabled });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/disputes', disputeRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
