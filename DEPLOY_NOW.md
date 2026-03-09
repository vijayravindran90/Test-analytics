# Railway Production Deployment - Quick Steps

## 1. Set Environment Variables in Railway

Go to your Railway backend service → Variables tab and add:

```bash
JWT_SECRET=<paste-output-below>
NODE_ENV=production
FRONTEND_URL=https://vijayravindran90.github.io
PORT=3001
```

**Generate your JWT_SECRET now:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and paste it as `JWT_SECRET` in Railway.

## 2. Update Frontend Production URL

Edit this file: `packages/frontend/.env.production`

Change the URL to your Railway backend:
```bash
VITE_API_URL=https://test-analytics-production.up.railway.app/api
```

## 3. Deploy

```bash
# Commit all changes
git add .
git commit -m "Add user authentication and ownership"
git push origin main
```

Railway will automatically:
- Install dependencies
- Build backend and frontend
- Run database migrations
- Start the server

## 4. Verify Migration Ran

Check Railway deployment logs for:
```
✓ Migration 005_auth_and_project_ownership.sql completed successfully
```

## 5. Test Production

1. Open: https://vijayravindran90.github.io/Test-analytics/
2. Click "Login" → "Create account"
3. Register with your email
4. Create a project
5. Upload test results

## Troubleshooting

**If migrations don't run:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run migrations manually
railway run npm run db:migrate -w packages/backend
```

**If frontend can't reach backend:**
- Check `VITE_API_URL` in `.env.production`
- Rebuild frontend: `npm run build -w packages/frontend`
- Check CORS in Railway: `FRONTEND_URL` should include your frontend domain

Done! 🚀
