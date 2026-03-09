# Production Deployment Guide

## Railway Deployment with PostgreSQL

### Prerequisites
- Railway account (https://railway.app)
- GitHub repository with your code

### Step 1: Setup Railway Project

1. Go to https://railway.app and create a new project
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `Test-analytics` repository
4. Railway will create a service for your app

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically provision a Postgres database
3. The `DATABASE_URL` environment variable will be automatically set

### Step 3: Configure Backend Environment Variables

In your Railway backend service settings, add these environment variables:

```bash
# Database (already set by Railway)
DATABASE_URL=postgresql://...  # Auto-configured by Railway

# Server
PORT=3001
NODE_ENV=production

# Frontend URL (update after frontend is deployed)
FRONTEND_URL=https://your-frontend-url.railway.app

# Auth - IMPORTANT: Generate a secure random string
JWT_SECRET=<generate-a-secure-random-string-here>

# Optional Admin Key
ADMIN_KEY=<your-secure-admin-key>
```

**Generate a secure JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 4: Run Database Migrations

**Option A: One-time migration via Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run db:migrate -w packages/backend
```

**Option B: Auto-migrate on deploy (Recommended)**

Update your `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run install-all && npm run build"
  },
  "deploy": {
    "startCommand": "npm run db:migrate -w packages/backend && npm run start"
  }
}
```

### Step 5: Deploy Frontend (GitHub Pages)

If you're using GitHub Pages for frontend:

1. Update `packages/frontend/.env.production` with your Railway backend URL:
   ```bash
   VITE_API_URL=https://your-backend-service.up.railway.app/api
   ```

2. Build and deploy:
   ```bash
   npm run build -w packages/frontend
   # Commit and push dist folder or use gh-pages
   ```

### Step 6: Deploy Frontend (Railway - Alternative)

If deploying frontend to Railway too:

1. Create a new service in Railway for the frontend
2. Set build command: `npm install && npm run build -w packages/frontend`
3. Set start command: `npx serve -s packages/frontend/dist -p $PORT`
4. Add environment variable:
   ```bash
   VITE_API_URL=https://your-backend-service.up.railway.app/api
   ```

### Step 7: Update CORS Settings

Update backend `FRONTEND_URL` in Railway to allow your frontend domain:
```bash
FRONTEND_URL=https://your-frontend-url.up.railway.app
```

Or for multiple origins, update `packages/backend/src/server.ts`:
```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://vijayravindran90.github.io',
    'https://your-frontend.railway.app'
  ],
  credentials: true,
}));
```

### Step 8: Test Production Setup

1. Register a new user account
2. Create a test project
3. Upload test results via the reporter
4. Verify dashboard shows data scoped to your user

### Monitoring & Logs

View logs in Railway:
1. Click on your service
2. Go to "Deployments" tab
3. Click "View Logs"

### Troubleshooting

**Migration errors:**
- Check `DATABASE_URL` is correctly set
- Verify database is running
- Run migrations manually: `railway run npm run db:migrate -w packages/backend`

**Auth errors:**
- Ensure `JWT_SECRET` is set and matches between deploys
- Check frontend CORS is allowed in backend `FRONTEND_URL`

**Connection errors:**
- Verify `VITE_API_URL` points to correct backend
- Check Railway service is running
- Verify CORS settings

### Security Checklist

- ✅ Set strong `JWT_SECRET` (32+ random characters)
- ✅ Set `NODE_ENV=production`
- ✅ Use HTTPS for all production URLs
- ✅ Restrict CORS to your specific frontend domains
- ✅ Set secure `ADMIN_KEY` if using admin endpoints
- ✅ Enable Railway's built-in DDoS protection
- ✅ Regularly backup your Postgres database

### Environment Variable Summary

**Backend (Railway Service):**
```bash
DATABASE_URL=postgresql://...      # Auto-set by Railway
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend.url
JWT_SECRET=<32-char-random-string>
ADMIN_KEY=<optional-admin-key>
```

**Frontend (Build-time):**
```bash
VITE_API_URL=https://your-backend.railway.app/api
```

---

## Quick Deploy Commands

```bash
# 1. Build everything locally to test
npm run build

# 2. Push to GitHub (Railway auto-deploys)
git add .
git commit -m "Deploy with auth and ownership"
git push origin main

# 3. Run migrations on Railway
railway run npm run db:migrate -w packages/backend

# 4. Verify deployment
curl https://your-backend.railway.app/api/health
```

Your production deployment with user authentication is now complete! 🚀
