// Escapes user input before it is placed inside a RegExp (prevents regex injection).
export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
