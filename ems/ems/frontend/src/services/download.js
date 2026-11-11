import api from './api';

// Downloads a file from an authenticated endpoint (a plain <a href> cannot send the JWT).
export async function downloadFile(path, params, fallbackName) {
  const res = await api.get(path, { params, responseType: 'blob' });
  const match = /filename="?([^"]+)"?/.exec(res.headers['content-disposition'] || '');
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
