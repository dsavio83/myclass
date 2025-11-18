import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Learning Platform...\n');

// Start backend server
console.log('📦 Starting backend server...');
const backend = spawn('node', ['backend/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Poll backend health endpoint and start frontend when ready
const HEALTH_CHECK_URL = { hostname: '127.0.0.1', port: 5000, path: '/api/health', method: 'GET' };
const HEALTH_POLL_INTERVAL = 500; // ms
const HEALTH_TIMEOUT = 10000; // ms

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.request(HEALTH_CHECK_URL, (res) => {
      // consider any 2xx OK
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function waitForBackend() {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkHealth();
    if (ok) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL));
  }
  return false;
}

(async () => {
  process.stdout.write('⏱ Waiting for backend to be ready... ');
  const ready = await waitForBackend();
  if (ready) {
    console.log('backend ready.');
  } else {
    console.log('timed out (continuing anyway).');
  }

  console.log('\n🎨 Starting frontend development server...\n');
  // Start frontend server
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (error) => {
    console.error('❌ Frontend error:', error);
  });

  frontend.on('exit', (code) => {
    console.log(`Frontend exited with code ${code}`);
    backend.kill();
    process.exit(code);
  });
})();

backend.on('error', (error) => {
  console.error('❌ Backend error:', error);
});

backend.on('exit', (code) => {
  console.log(`Backend exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down servers...');
  backend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down servers...');
  backend.kill();
  process.exit(0);
});
