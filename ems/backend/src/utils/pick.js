// Copies only the listed keys that are present on the object (whitelisting).
export const pick = (obj = {}, keys = []) =>
  keys.reduce((acc, k) => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) acc[k] = obj[k];
    return acc;
  }, {});
