import dotenv from 'dotenv';

dotenv.config();

// Allowed browser origins. Defaults cover the Vite web client (5173) and the
// Expo web preview (8081); override/extend with a comma-separated CLIENT_ORIGIN.
// Native apps (Expo Go) send no Origin header and aren't subject to CORS.
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:8081';

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  port: process.env.PORT || 4000,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  clientOrigin,
  clientOrigins: clientOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Base URL the client is served from — used to build links inside emails.
  appBaseUrl:
    process.env.APP_BASE_URL ||
    clientOrigin.split(',')[0].trim() ||
    'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/circuitvision',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  mail: {
    from: process.env.MAIL_FROM || 'CircuitVision <no-reply@circuitvision.test>',
    smtpUrl: process.env.SMTP_URL || '',
  },
  // Roboflow component scanning (local inference server + workflow). The
  // workspace/workflow default to the project's trained classifier; only the
  // API key is secret and must come from the environment.
  roboflow: {
    apiUrl: process.env.ROBOFLOW_API_URL || 'http://localhost:9001',
    apiKey: process.env.ROBOFLOW_API_KEY || '',
    workspace: process.env.ROBOFLOW_WORKSPACE || 'julianes-workspace',
    workflowId: process.env.ROBOFLOW_WORKFLOW_ID || 'arvision-dfktg',
  },
};

// True only when an SMTP transport is configured. When false, the mailer logs
// the message (and any action link) to the server console and returns the link
// so dev flows are testable without a real inbox — mirroring the Cloudinary
// fallback pattern.
export const mailerEnabled = Boolean(env.mail.smtpUrl);

// Component scanning is available only when an API key is configured. When
// false, POST /api/scan reports it's unavailable and the create form falls
// back to manual category selection.
export const roboflowEnabled = Boolean(env.roboflow.apiKey);

// True only when all three Cloudinary credentials are present. When false,
// the image upload helper falls back to a stubbed placeholder URL so the app
// is still runnable end-to-end without a Cloudinary account.
export const cloudinaryEnabled = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);
