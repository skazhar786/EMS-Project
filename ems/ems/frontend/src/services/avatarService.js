import api from './api';

// basePath: '/profile' (employee, own picture) or `/employees/${id}` (admin)
export const uploadAvatar = (basePath, file) => {
  const form = new FormData();
  form.append('avatar', file);
  return api.put(`${basePath}/avatar`, form);
};

export const removeAvatar = (basePath) => api.delete(`${basePath}/avatar`);
