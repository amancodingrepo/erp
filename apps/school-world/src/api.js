const API_PREFIX = '/api';

export class ApiError extends Error {
  constructor(message, status = 500, code = 'API_ERROR') { super(message); this.name = 'ApiError'; this.status = status; this.code = code; }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options, headers, credentials: 'same-origin',
    body: hasBody && typeof options.body !== 'string' && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
  });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => ({}));
      message = body.message || body.error || message;
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return null;
  if (contentType.includes('text/csv')) return response;
  return contentType.includes('application/json') ? response.json() : response.text();
}

export const apiGet = path => apiRequest(path, { method: 'GET' });
export const apiPost = (path, body) => apiRequest(path, { method: 'POST', body });
export const apiPut = (path, body) => apiRequest(path, { method: 'PUT', body });
export const apiPatch = (path, body) => apiRequest(path, { method: 'PATCH', body });
export const apiDelete = path => apiRequest(path, { method: 'DELETE' });

export async function downloadApiFile(path, fallbackName = 'export.csv') {
  const response = await apiRequest(path, { method: 'GET' });
  if (!(response instanceof Response)) throw new Error('The download endpoint did not return a file.');
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const name = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
