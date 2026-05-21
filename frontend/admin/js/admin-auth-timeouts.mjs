/**
 * Promise timeouts for admin auth (prevents hung login UI).
 */

export const LOGIN_REQUEST_TIMEOUT_MS = 10000;
export const ADMIN_VERIFY_TIMEOUT_MS = 10000;
export const AUTH_BOOT_TIMEOUT_MS = 6000;

export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
