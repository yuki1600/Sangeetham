// Resolves API URLs against an optional base set at build time.
// In dev (no env var), paths stay relative and the Vite proxy forwards them
// to the local Express server. In production builds, set VITE_API_BASE_URL
// to the absolute URL of the deployed backend (e.g. https://sangeetham-api.onrender.com).
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE}${path}`;
