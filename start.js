import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Wait for backend to be ready (give it 3 seconds)
setTimeout(() => {
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
}, 3000);

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