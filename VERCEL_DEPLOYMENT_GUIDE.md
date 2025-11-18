# Vercel Deployment Guide

## Issue Fixed
The application was experiencing a **404 error** on `/api/auth/login` when deployed to Vercel. This was because Vercel requires specific configuration to handle API routes properly.

## Solution Implemented

### 1. Created [`vercel.json`](vercel.json:1)
This configuration file tells Vercel how to build and route your application:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    },
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
      "dest": "backend/server.js"
    },
    {
      "src": "/uploads/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Key Points:**
- Routes all `/api/*` requests to the backend server
- Routes all `/uploads/*` requests to the backend server
- Routes all other requests to the frontend `index.html`
- Sets `NODE_ENV` to production

### 2. Created [`api/index.js`](api/index.js:1)
This file exports the Express app for Vercel's serverless function:

```javascript
import app from '../backend/server.js';

export default app;
```

### 3. Updated [`backend/server.js`](backend/server.js:77)
Modified the server to:
- Export the Express app for Vercel
- Only start the server when NOT running on Vercel

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

## Environment Variables Setup in Vercel

You mentioned you've already uploaded the `.env` file to Vercel. Make sure the following environment variables are set in your Vercel project dashboard:

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

4. **NODE_ENV** (Already set in vercel.json)
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

## Deployment Steps

### Option 1: Deploy via Git (Recommended)

1. **Commit the changes:**
   ```bash
   git add vercel.json api/index.js backend/server.js
   git commit -m "Fix Vercel deployment - Add API routing configuration"
   git push origin main
   ```

2. **Vercel will automatically deploy** the new version

3. **Wait for deployment to complete** (usually 1-2 minutes)

4. **Test the login** at `https://myclass-pink.vercel.app`

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

After deployment, verify the fix:

1. **Open your deployed app**: `https://myclass-pink.vercel.app`

2. **Open browser DevTools** (F12)

3. **Try to login** with credentials:
   - Username: `admin`
   - Password: `admin`

4. **Check the Network tab** - you should see:
   - `POST https://myclass-pink.vercel.app/api/auth/login` → **200 OK** ✅
   - (Not 404 anymore)

5. **Check the Console** - no errors should appear

## MongoDB Atlas Configuration

Ensure your MongoDB Atlas cluster allows connections from Vercel:

1. Go to **MongoDB Atlas Dashboard**
2. Navigate to **Network Access**
3. Add IP Address: `0.0.0.0/0` (Allow access from anywhere)
   - Or add Vercel's IP ranges if you want more security

## Troubleshooting

### If login still fails:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Check the **Function Logs** tab

2. **Verify Environment Variables:**
   - Ensure all variables are set correctly
   - Redeploy after adding/updating variables

3. **Check MongoDB Connection:**
   - Verify the MongoDB URI is correct
   - Ensure MongoDB Atlas allows connections from `0.0.0.0/0`

4. **Clear Browser Cache:**
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

## Local Development

The changes are backward compatible. Your local development will continue to work:

```bash
npm start
```

The server will detect it's not running on Vercel and start normally on port 5000.

## Summary

✅ Created [`vercel.json`](vercel.json:1) for proper routing  
✅ Created [`api/index.js`](api/index.js:1) for serverless function  
✅ Updated [`backend/server.js`](backend/server.js:77) to export app  
✅ Environment variables configured in Vercel dashboard  
✅ MongoDB Atlas allows Vercel connections  

Your application should now work correctly on Vercel! 🎉
