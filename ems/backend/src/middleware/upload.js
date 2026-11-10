import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { AVATAR_DIR } from '../config/paths.js';
import { ApiError } from '../utils/ApiError.js';

fs.mkdirSync(AVATAR_DIR, { recursive: true });

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  // The client-supplied filename is never used: random name + extension chosen by us.
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXTENSIONS[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) =>
    EXTENSIONS[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest('Only JPG, PNG or WebP images are allowed')),
});

// The mimetype comes from the client, so also check the real file signature.
const hasImageSignature = async (filePath) => {
  const handle = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const png = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const webp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
    return jpeg || png || webp;
  } finally {
    await handle.close();
  }
};

export const discardUpload = async (file) => {
  if (file?.path) await fsp.unlink(file.path).catch(() => {});
};

// Usage: router.put('/avatar', uploadAvatar, controller)   (form field name: "avatar")
export const uploadAvatar = (req, res, next) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Image must be 2 MB or smaller'));
      if (err instanceof multer.MulterError) return next(ApiError.badRequest(err.message));
      return next(err);
    }
    if (!req.file) return next(ApiError.badRequest('Please choose an image to upload'));
    try {
      if (!(await hasImageSignature(req.file.path))) {
        await discardUpload(req.file);
        return next(ApiError.badRequest('The uploaded file is not a valid image'));
      }
      next();
    } catch (e) {
      await discardUpload(req.file);
      next(e);
    }
  });
};
