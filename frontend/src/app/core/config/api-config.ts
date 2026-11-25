/**
 * Dynamic API & WebSocket Configuration for ABHI Frontend.
 *
 * Automatically detects backend location without hardcoded localhost/IPs:
 * - If running in production (served by backend or reverse proxy): uses relative path ''
 * - If running in development (e.g. port 4200): targets current hostname on port 8000
 * - Supports runtime overrides via window.__ABHI_CONFIG__ or localStorage['ABHI_API_BASE']
 */

declare global {
  interface Window {
    __ABHI_CONFIG__?: {
      apiBaseUrl?: string;
      wsBaseUrl?: string;
    };
  }
}

/**
 * Returns the base URL for backend HTTP API calls (e.g. '' or 'http://127.0.0.1:8000').
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }

  // 1. Explicit runtime config override
  if (window.__ABHI_CONFIG__?.apiBaseUrl) {
    return window.__ABHI_CONFIG__.apiBaseUrl.replace(/\/+$/, '');
  }

  // 2. Local storage override (user settings)
  let stored: string | null = null;
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      stored = localStorage.getItem('ABHI_API_BASE');
    }
  } catch {
    // Ignore localStorage access errors in restricted/headless environments
  }
  if (stored) {
    return stored.replace(/\/+$/, '');
  }

  const { protocol, hostname, port } = window.location;

  // 3. If running on same port as backend (8000) or standard web ports (80/443 without dev port)
  if (port === '8000' || (!port && (protocol === 'http:' || protocol === 'https:'))) {
    return '';
  }

  // 4. Default dynamic development: connect to same host on port 8000
  const host = hostname || '127.0.0.1';
  return `${protocol}//${host}:8000`;
}

/**
 * Formats a full API endpoint URL dynamically.
 */
export function getApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * Returns dynamic WebSocket URL based on current origin.
 */
export function getWsUrl(endpoint: string): string {
  if (typeof window === 'undefined') {
    return 'ws://127.0.0.1:8000';
  }

  if (window.__ABHI_CONFIG__?.wsBaseUrl) {
    return `${window.__ABHI_CONFIG__.wsBaseUrl.replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  const { protocol, hostname, port } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (port === '8000' || (!port && (protocol === 'http:' || protocol === 'https:'))) {
    return `${wsProto}//${window.location.host}${cleanEndpoint}`;
  }

  const host = hostname || '127.0.0.1';
  return `${wsProto}//${host}:8000${cleanEndpoint}`;
}

let activeSessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  activeSessionToken = token;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (token) {
        sessionStorage.setItem('ABHI_SESSION_TOKEN', token);
      } else {
        sessionStorage.removeItem('ABHI_SESSION_TOKEN');
      }
    }
  } catch {
    // Ignore storage restriction errors
  }
}

export function getSessionToken(): string | null {
  if (activeSessionToken) return activeSessionToken;
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('ABHI_SESSION_TOKEN');
    }
  } catch {
    // Ignore storage restriction errors
  }
  return null;
}

/**
 * Returns authoritative authorization headers for authenticated backend communication.
 * Dynamically resolves session tokens without any hardcoded credentials.
 */
export function getApiHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  const token = getSessionToken();
  if (token) {
    headers['X-API-Key'] = token;
  }
  return headers;
}

/**
 * Bootstraps local session dynamically from backend gateway without embedded secrets.
 */
export async function bootstrapSession(): Promise<string | null> {
  const existing = getSessionToken();
  if (existing) return existing;

  try {
    const url = getApiUrl('/api/v1/auth/bootstrap');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.session_token) {
        setSessionToken(data.session_token);
        return data.session_token;
      }
    }
  } catch (e) {
    console.debug('[AUTH] Session bootstrap deferred:', e);
  }
  return null;
}
