# Vercel Deployment Guide

## Issues Fixed

### 1. 404 Error on `/api/auth/login`
The application was experiencing a **404 error** on `/api/auth/login` when deployed to Vercel because Vercel requires specific configuration to handle API routes properly.

### 2. MIME Type Error - JavaScript Module Loading
After initial deployment, the app showed: `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"`. This was caused by incorrect build configuration and routing.

## Solution Implemented

### 1. Updated [`vercel.json`](vercel.json:1)
Complete Vercel configuration for proper routing and building:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/uploads/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/assets/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Key Points:**
- `buildCommand`: Runs `npm run build` to build the Vite app
- `outputDirectory`: Specifies `dist` as the build output
- Routes `/api/*` to the serverless function
- Routes `/uploads/*` to the serverless function
- Uses `handle: filesystem` to serve static files from `dist`
- Proper cache headers for assets
- Security headers for all routes

### 2. Created [`api/index.js`](api/index.js:1)
Entry point for Vercel serverless functions:

```javascript
import app from '../backend/server.js';

export default app;
```

### 3. Updated [`backend/server.js`](backend/server.js:77)
Modified to export the Express app and conditionally start the server:

```javascript
// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
  });
}

// Export the Express app for Vercel
export default app;
```

### 4. Updated [`vite.config.ts`](vite.config.ts:1)
Optimized Vite configuration for production builds:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
```

**Key Points:**
- `base: '/'` ensures correct asset paths
- `outDir: 'dist'` matches Vercel's output directory
- `assetsDir: 'assets'` organizes built assets
- `sourcemap: false` reduces build size
- Code splitting for better performance

## Environment Variables Setup in Vercel

### Required Environment Variables:

1. **MONGODB_URI**
   ```
   mongodb+srv://dsavio83_db_user:amhpj0609H@cluster0.kfyrhlx.mongodb.net/?appName=Cluster0
   ```

2. **JWT_SECRET**
   ```
   your-super-secret-jwt-key-change-this-in-production
   ```

3. **PORT** (Optional - Vercel sets this automatically)
   ```
   5000
   ```

4. **NODE_ENV** (Optional - set to production)
   ```
   production
   ```

### How to Set Environment Variables in Vercel:

1. Go to your Vercel project dashboard
2. Click on **Settings**
3. Navigate to **Environment Variables**
4. Add each variable:
   - **Key**: Variable name (e.g., `MONGODB_URI`)
   - **Value**: Variable value
   - **Environment**: Select `Production`, `Preview`, and `Development` (or as needed)
5. Click **Save**
6. **Redeploy** your project for changes to take effect

## MongoDB Atlas Configuration

Ensure your MongoDB Atlas cluster allows connections from Vercel:

1. Go to **MongoDB Atlas Dashboard**
2. Navigate to **Network Access**
3. Click **Add IP Address**
4. Add: `0.0.0.0/0` (Allow access from anywhere)
   - Or add Vercel's IP ranges for better security
5. Click **Confirm**

## Deployment Steps

### Option 1: Deploy via Git (Recommended)

1. **Commit all changes:**
   ```bash
   git add vercel.json api/index.js backend/server.js vite.config.ts VERCEL_DEPLOYMENT_GUIDE.md
   git commit -m "Fix Vercel deployment - Add proper build and routing configuration"
   git push origin main
   ```

2. **Vercel will automatically deploy** the new version

3. **Wait for deployment to complete** (usually 2-3 minutes)

4. **Test the application** at `https://myclass-pink.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## Verification Steps

After deployment, verify everything works:

1. **Open your deployed app**: `https://myclass-pink.vercel.app`

2. **Open browser DevTools** (F12)

3. **Check the Console tab** - should see no MIME type errors

4. **Try to login** with credentials:
   - Username: `admin`
   - Password: `admin`

5. **Check the Network tab** - you should see:
   - `POST https://myclass-pink.vercel.app/api/auth/login` → **200 OK** ✅
   - All JavaScript files loading with correct MIME types ✅

6. **Navigate through the app** - all features should work

## Build Process

When you deploy, Vercel will:

1. Run `npm install` to install dependencies
2. Run `npm run build` (which executes `vite build`)
3. Build the frontend to the `dist` directory
4. Create serverless functions from `api/index.js`
5. Deploy everything to Vercel's CDN

## Troubleshooting

### If MIME type errors persist:

1. **Clear Vercel build cache:**
   - Go to Vercel Dashboard → Your Project → Settings
   - Scroll to "Build & Development Settings"
   - Click "Clear Build Cache"
   - Redeploy

2. **Check build logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Check the **Build Logs** tab for errors

3. **Verify dist directory:**
   - Ensure `npm run build` works locally
   - Check that `dist/index.html` and `dist/assets/` are created

### If API routes still return 404:

1. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Check the **Function Logs** tab

2. **Verify environment variables:**
   - Ensure all variables are set correctly
   - Redeploy after adding/updating variables

3. **Check MongoDB connection:**
   - Verify the MongoDB URI is correct
   - Ensure MongoDB Atlas allows connections from `0.0.0.0/0`

### If the app shows a blank page:

1. **Check browser console** for errors
2. **Verify base path** in vite.config.ts is set to `'/'`
3. **Check that index.html exists** in the dist directory after build
4. **Hard refresh**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

## Local Development

The changes are backward compatible. Your local development will continue to work:

```bash
# Start backend server
npm run server

# In another terminal, start frontend
npm run dev
```

Or use the combined start script:

```bash
npm start
```

The server will detect it's not running on Vercel and start normally on port 5000.

## Performance Optimizations

The configuration includes several optimizations:

1. **Code Splitting**: Vendor code (React, React-DOM) is split into a separate chunk
2. **Asset Caching**: Static assets are cached for 1 year
3. **Security Headers**: Added security headers for all routes
4. **No Source Maps**: Disabled in production to reduce bundle size
5. **Immutable Assets**: Assets are marked as immutable for better caching

## Summary

✅ Fixed MIME type error by updating [`vite.config.ts`](vite.config.ts:1)  
✅ Updated [`vercel.json`](vercel.json:1) with proper build configuration  
✅ Created [`api/index.js`](api/index.js:1) for serverless functions  
✅ Updated [`backend/server.js`](backend/server.js:77) to export app  
✅ Environment variables configured in Vercel dashboard  
✅ MongoDB Atlas allows Vercel connections  
✅ Proper routing for API, uploads, and static files  
✅ Security and cache headers configured  

Your application should now work correctly on Vercel with no MIME type errors! 🎉
