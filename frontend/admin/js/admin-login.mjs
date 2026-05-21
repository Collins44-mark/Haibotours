/** Legacy login module — all sign-in happens on /admin (admin-shell.mjs). */
import { resolveDashboardPath } from './admin-auth-guard.mjs';

const local =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.location.replace(local ? '/admin/index.html' : resolveDashboardPath());
