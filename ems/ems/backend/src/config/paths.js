import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const UPLOAD_DIR = path.resolve(here, '../../uploads');
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
export const AVATAR_URL_PREFIX = '/uploads/avatars'; // how avatar paths are stored in MongoDB
