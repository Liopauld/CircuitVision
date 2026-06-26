import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { ApiError } from '../middleware/errorHandler.js';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

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

  const token = signToken(user);
  res.status(201).json({ token, user: user.toPublicJSON() });
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
