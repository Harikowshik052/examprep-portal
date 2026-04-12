const TOKEN_KEY = 'vishnu_auth_token';
const EMAIL_KEY = 'vishnu_auth_email';

export function saveSession(token, email) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EMAIL_KEY, email);
}

export function getSession() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const email = sessionStorage.getItem(EMAIL_KEY);
  return token && email ? { token, email } : null;
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
}

/**
 * Decode JWT payload (no signature verification on client — only for reading claims).
 * Signature is verified by the backend on sensitive operations.
 */
export function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
