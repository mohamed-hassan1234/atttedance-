import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import fs from 'fs';

// Manual override: point VITE_HTTPS_KEY/CERT at a hand-generated cert (e.g. from
// scripts/create-iphone-cert.ps1) instead of the mkcert-managed one below.
const manualHttpsConfig = (env) => {
  const keyPath = env.VITE_HTTPS_KEY;
  const certPath = env.VITE_HTTPS_CERT;

  if (!keyPath || !certPath) return undefined;

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const manualHttps = manualHttpsConfig(env);
  const httpsDisabled = env.VITE_HTTPS === 'false';

  return {
    plugins: [
      react(),
      // Live camera access (getUserMedia) needs a secure context, so HTTPS is on by
      // default in local dev. mkcert generates a cert covering localhost + this
      // machine's LAN IPs and trusts it in the dev machine's own browser/OS store
      // automatically. Phones are a separate trust store, so the printed CA root
      // still needs a one-time manual install there — see README "Local HTTPS Dev
      // Setup". Set VITE_HTTPS=false to run plain HTTP instead (no camera access
      // off localhost, but zero cert setup).
      !httpsDisabled && !manualHttps && mkcert(),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      // Dev only: accept requests arriving through a Cloudflare Quick Tunnel
      // (https://<random>.trycloudflare.com) for phone camera testing. Vite skips
      // its Host check while HTTPS is on, so this only matters with VITE_HTTPS=false;
      // then every other unknown Host header is still rejected.
      allowedHosts: ['.trycloudflare.com'],
      https: httpsDisabled ? false : (manualHttps || true),
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          // The browser only ever talks to Vite (same-origin /api). Drop the
          // browser's Origin header on the server-to-server hop so Express's strict
          // CLIENT_URL CORS list does not need every random tunnel URL added.
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
          },
        },
      },
    },
  };
});
