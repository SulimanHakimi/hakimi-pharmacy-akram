// The API lives in this same Next.js app under /api, so requests are same-origin —
// no base URL to configure and no CORS.
const BASE = '/api';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hp_token');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('hp_user')); } catch { return null; }
}

export function storeSession(token, user) {
  localStorage.setItem('hp_token', token);
  localStorage.setItem('hp_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('hp_token');
  localStorage.removeItem('hp_user');
}

export async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/login')) {
      clearSession();
      window.location.href = '/';
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
