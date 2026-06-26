import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { sendMail, devLink } from '../services/mailService.js';
import { ApiError } from '../middleware/errorHandler.js';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Generate a single-use token: the raw value goes in the emailed link, only its
// hash is persisted (so a DB leak doesn't expose usable tokens).
function makeToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: sha256(raw) };
}

// Issue a fresh email-verification token for a user and "send" the link.
async function issueVerification(user) {
  const { raw, hash } = makeToken();
  user.verifyTokenHash = hash;
  user.verifyTokenExpires = new Date(Date.now() + VERIFY_TTL_MS);
  await user.save();
  const link = `${env.appBaseUrl}/verify?token=${raw}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your CircuitVision email',
    text: 'Confirm your email address to finish setting up your account.',
    link,
  });
  return link;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Roles a user is allowed to self-select at registration. Admin is assigned
// only by the seed script or by promotion, never via public signup.
const SELF_SIGNUP_ROLES = ['customer', 'seller'];

export async function register(req, res) {
  const { name, email, password, studentId, role } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required.');
  }
  if (!EMAIL_RE.test(email)) {
    throw new ApiError(400, 'Please provide a valid email address.');
  }
  if (String(password).length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  const chosenRole = role || 'customer';
  if (!SELF_SIGNUP_ROLES.includes(chosenRole)) {
    throw new ApiError(400, 'Role must be either customer or seller.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with that email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    studentId,
    role: chosenRole,
  });

  // Kick off email verification (mock-mailed; link surfaced in dev). Failures
  // here must not block signup, so swallow and let the user re-request later.
  let verifyLink;
  try {
    verifyLink = await issueVerification(user);
  } catch {
    verifyLink = undefined;
  }

  const token = signToken(user);
  res.status(201).json({
    token,
    user: user.toPublicJSON(),
    verification: { sent: Boolean(verifyLink), devLink: devLink(verifyLink) },
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (user.isBanned) {
    throw new ApiError(403, 'This account has been suspended. Contact an admin.');
  }

  const token = signToken(user);
  res.json({ token, user: user.toPublicJSON() });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }
  res.json({ user: user.toPublicJSON() });
}

// PATCH /api/auth/me — update the current user's profile (name, bio, accent
// colour, and optional avatar image via multipart field "avatar").
export async function updateMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found.');

  const { name, bio, accentColor } = req.body;

  if (name !== undefined) {
    if (!String(name).trim()) throw new ApiError(400, 'Name cannot be empty.');
    user.name = String(name).trim();
  }
  if (bio !== undefined) {
    user.bio = String(bio).trim().slice(0, 280);
  }
  if (accentColor !== undefined) {
    const c = String(accentColor).trim();
    if (c && !HEX_COLOR_RE.test(c)) {
      throw new ApiError(400, 'accentColor must be a hex colour like #c98a3a.');
    }
    user.accentColor = c;
  }
  if (req.file) {
    user.avatarUrl = await uploadImageBuffer(req.file.buffer, 'circuitvision/avatars');
  }

  await user.save();
  res.json({ user: user.toPublicJSON() });
}

// POST /api/auth/verify/request — (authed) re-send the email-verification link.
export async function requestVerification(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.isVerified) {
    return res.json({ sent: false, message: 'Your email is already verified.' });
  }
  const link = await issueVerification(user);
  res.json({ sent: true, message: 'Verification email sent.', devLink: devLink(link) });
}

// POST /api/auth/verify  { token } — confirm an email-verification token.
export async function verifyEmail(req, res) {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'Verification token is required.');

  const user = await User.findOne({
    verifyTokenHash: sha256(String(token)),
    verifyTokenExpires: { $gt: new Date() },
  });
  if (!user) throw new ApiError(400, 'This verification link is invalid or has expired.');

  user.isVerified = true;
  user.verifyTokenHash = null;
  user.verifyTokenExpires = null;
  await user.save();

  res.json({ user: user.toPublicJSON() });
}

// POST /api/auth/password/forgot  { email } — begin password recovery. Always
// responds 200 so the endpoint can't be used to probe which emails exist.
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required.');

  const user = await User.findOne({ email: String(email).toLowerCase() });
  let link;
  if (user && !user.isBanned) {
    const { raw, hash } = makeToken();
    user.resetTokenHash = hash;
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();
    link = `${env.appBaseUrl}/reset?token=${raw}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your CircuitVision password',
      text: 'Use the link below to choose a new password. It expires in 1 hour.',
      link,
    });
  }

  res.json({
    message: 'If an account exists for that email, a reset link has been sent.',
    devLink: devLink(link),
  });
}

// POST /api/auth/password/reset  { token, password } — set a new password.
export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    throw new ApiError(400, 'Token and new password are required.');
  }
  if (String(password).length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  const user = await User.findOne({
    resetTokenHash: sha256(String(token)),
    resetTokenExpires: { $gt: new Date() },
  });
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired.');

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  await user.save();

  res.json({ message: 'Your password has been reset. You can now log in.' });
}
