import fs from 'fs/promises';
import path from 'path';
import { AVATAR_DIR, AVATAR_URL_PREFIX } from '../config/paths.js';

// Deletes a stored avatar file. Only files inside the avatars folder can ever be removed.
export const deleteAvatarFile = async (publicPath) => {
  if (!publicPath || !publicPath.startsWith(`${AVATAR_URL_PREFIX}/`)) return;
  await fs.unlink(path.join(AVATAR_DIR, path.basename(publicPath))).catch(() => {});
};

export const setEmployeeAvatar = async (employee, file) => {
  const previous = employee.profilePicture;
  employee.profilePicture = `${AVATAR_URL_PREFIX}/${file.filename}`;
  await employee.save();
  await deleteAvatarFile(previous);
};

export const clearEmployeeAvatar = async (employee) => {
  const previous = employee.profilePicture;
  employee.profilePicture = '';
  await employee.save();
  await deleteAvatarFile(previous);
};
