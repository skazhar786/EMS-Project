// Backend files (e.g. profile pictures) are stored as "/uploads/..." paths.
// This turns them into a full URL that works in dev and in production.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const assetUrl = (path) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path}`;
};
