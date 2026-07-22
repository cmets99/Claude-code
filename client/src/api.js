const BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'dashboard_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const authApi = {
  status: () => request('/api/auth/status'),
  setup: (pin) => request('/api/auth/setup', { method: 'POST', body: JSON.stringify({ pin }) }),
  verify: (pin) => request('/api/auth/verify', { method: 'POST', body: JSON.stringify({ pin }) }),
};

export const itemsApi = {
  list: () => request('/api/items'),
  create: (content) => request('/api/items', { method: 'POST', body: JSON.stringify({ content }) }),
  update: (id, patch) => request(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
};
