# Changelog

All notable changes to the Test Analytics Dashboard project are documented in this file.

## [1.1.0] - 2024-03-09

### ✨ Major Features

#### 🔐 **User Authentication System (Breaking Change)**
- Added JWT-based user authentication with 7-day token expiry
- Users must now create an account and log in to access the dashboard
- Password hashing with bcryptjs (10 rounds) for secure credential storage
- Session management with token storage in browser localStorage

**New Authentication Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login with credentials
- `GET /api/auth/me` - Get current user profile

#### 🏠 **Multi-Tenant Project Isolation (Breaking Change)**
- Each user's projects and test data are now completely private
- Project ownership enforced at database and API levels
- Per-user project name uniqueness (same name can exist across different users)
- All project and test data endpoints now require authentication

**Impact on Existing Data:**
- Existing projects in the database will have `user_id = NULL`
- These "orphaned" projects won't be visible to any user after upgrade
- Recommend backing up database before upgrading
- See migration guide below

#### 🛡️ **Protected Frontend Routes**
- Added `/login` page with registration and login forms
- All dashboard pages wrapped with `ProtectedRoute` component
- Automatic redirect to login when session expires (token > 7 days old)
- User profile and logout button in header

### 🔄 **Database Migrations**

#### Migration 005: Authentication & Project Ownership
```sql
-- Creates users table with email (unique), password_hash, name
-- Adds user_id foreign key to projects table
-- Creates indexes for efficient lookups
```

#### Migration 006: Per-User Project Uniqueness
```sql
-- Changes project name uniqueness from global to per-user
-- Old constraint: UNIQUE(name)
-- New constraint: UNIQUE(user_id, name)
-- Allows same project name across different user profiles
```

### 📦 **Dependencies Added**

**Backend:**
- `bcryptjs@^2.4.3` - Password hashing and verification
- `jsonwebtoken@^9.1.2` - JWT token generation and validation
- `uuid@^9.0.1` - User and project UUID generation

### 🎯 **Breaking Changes**

1. **All API Endpoints Now Require Authentication**
   - Every endpoint (except `/auth/register` and `/auth/login`) requires `Authorization: Bearer <token>` header
   - Legacy API keys removed
   - 401 response for missing/invalid tokens

   **Migration:**
   ```bash
   # Old way (no longer works)
   curl http://localhost:3001/api/projects
   
   # New way (required)
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        http://localhost:3001/api/projects
   ```

2. **Frontend Dashboard Login Required**
   - Dashboard now redirects to `/login` if not authenticated
   - Users cannot access any projects without creating an account
   - Token automatically refreshed on app load if valid

   **Migration:**
   - Visit dashboard
   - Click "Create Account" to register
   - Log in with your credentials
   - All previous projects will not be visible (ownership issue)

3. **Environment Variables Changed**
   - `JWT_SECRET` now required (instead of optional `API_KEY`)
   - `API_KEY` functionality removed

   **Migration:**
   ```bash
   # Old .env
   API_KEY=my-api-key
   
   # New .env
   JWT_SECRET=generated-with-openssl-rand-base64-32
   ```

4. **Database Schema Changes**
   - New `users` table required
   - `projects.user_id` foreign key required
   - `projects.name` uniqueness changed from global to per-user
   - `projects.owner` field no longer used (determined by user_id)

   **Migration:**
   - Run `npm run db:migrate` to apply migrations 005 & 006 automatically
   - Existing projects will have `user_id = NULL` (not accessible to any user)

### 📝 **Documentation Updates**

- **README.md**: Added authentication section, updated getting started guide
- **QUICKSTART.md**: Added step-by-step user registration and login instructions
- **docs/architecture.md**: Added JWT flow diagrams and multi-tenant architecture explanation
- **docs/setup-reference.md**: Added JWT_SECRET environment variable documentation

### 🚀 **Deployment Notes**

#### Railway Deployment
- Must set `JWT_SECRET` environment variable in Railway project settings
- Generate strong secret: `openssl rand -base64 32`
- Migrations run automatically on backend startup
- Frontend should use HTTPS in production

#### GitHub Pages Frontend Deployment
- Token stored in browser localStorage (secure for local access)
- CORS headers automatically configured for production URLs
- Update `VITE_API_URL` in `.env.production` to your backend URL

### 🔍 **Enhanced Error Handling**

- `409 Conflict` - Duplicate project name for logged-in user
- `401 Unauthorized` - Invalid or expired token
- `403 Forbidden` - User doesn't own the requested project
- Clear error messages displayed in UI

### ⚠️ **Known Issues & Limitations**

1. **Password Reset**: Not implemented in v1.1.0 (planned for v1.2.0)
   - Users who forget password must contact admin to reset database record
   - Store passwords securely

2. **Token Expiry**: 7-day tokens
   - Users need to log in again after 7 days of inactivity
   - Session preserved if browser localStorage not cleared

3. **No User Provisioning**: Only self-registration available
   - Admin cannot create accounts for other users
   - Each user must self-register

4. **No SSO/OAuth**: Not yet implemented
   - Email/password only in v1.1.0
   - OAuth2 integration planned for future release

### 🧪 **Testing Recommendations**

1. **Local Testing**
   ```bash
   # Run test suite with new auth flows
   npx playwright test
   ```

2. **Manual Verification**
   - Register new user via UI
   - Verify token stored in browser localStorage
   - Create projects and verify ownership isolation
   - Log in with different account and verify cannot see other's projects
   - Test token expiry by manually clearing token
   - Verify 401/403 responses with curl

### 📚 **Migration Guide for v1.0.3 Users**

#### Backup Your Data
```bash
# Backup existing database before migration
pg_dump test_analytics > backup_v103.sql
```

#### Update Application
```bash
# Pull latest version
git pull origin main

# Install dependencies
npm install

# Run migrations (automatic on backend start)
cd packages/backend
npm run db:migrate
cd ../..
```

#### Recreate Your Projects
1. Open dashboard at http://localhost:3000
2. Create new account or log in with existing credentials
3. Recreate your projects (note old projects are not visible)
4. Update `playwright.config.ts` with new project IDs
5. Re-run tests to populate new project

#### FAQ

**Q: What happened to my old projects?**
A: Old projects have `user_id = NULL` and are not accessible to any user. This is by design for v1.1.0. A migration tool to assign old projects to users may be provided in a future release.

**Q: Can I use the API without a UI?**
A: Yes! All endpoints available via REST API with Bearer token authentication.

**Q: How do I reset a user's password?**
A: Password reset not yet implemented. Direct database modification or contact support.

**Q: Can multiple users share a project?**
A: Not in v1.1.0. Projects are single-user owned. Team features planned for v1.2.0.

**Q: Is my token secure in localStorage?**
A: Token should only be stored in localStorage for single-user applications. For sensitive data, consider using secure HTTP-only cookies (future enhancement).

### 🙏 **Contributors**

- JWT authentication implementation
- Multi-tenant project isolation architecture
- Database migration scripts
- Frontend authentication components
- Documentation and migration guide

### 📋 **Upgrade Checklist**

- [ ] Backup database: `pg_dump test_analytics > backup.sql`
- [ ] Update application to v1.1.0
- [ ] Set `JWT_SECRET` in `.env` (generate: `openssl rand -base64 32`)
- [ ] Run migrations: `npm run db:migrate`
- [ ] Create new user account via UI
- [ ] Recreate projects with new IDs
- [ ] Update `playwright.config.ts` with new project IDs
- [ ] Test with: `npx playwright test`
- [ ] Verify projects visible only to logged-in user
- [ ] Deploy to production with new `JWT_SECRET`
- [ ] Users on production create accounts and re-add projects

---

## [1.0.3] - 2024-03-01

### Features
- Browser-specific analytics (Chromium, Firefox, WebKit)
- Test run organization with expandable details
- Performance alerts for test duration regressions
- Flaky test detection and trending
- Daily metrics aggregation
- Theme toggle (light/dark mode)

### Improvements
- Better error handling in API responses
- Improved database indexing for performance
- Enhanced chart visualization with Recharts

### Fixes
- Fixed browser detection in reporter
- Resolved timezone handling in metrics
- Fixed duplicate test result submission

---

## [1.0.0] - 2024-02-15

### Initial Release
- Playwright custom reporter
- Test metrics dashboard
- Projects management
- Test results batch submission
- CI/CD integration examples (GitHub Actions, GitLab CI, Jenkins)
- PostgreSQL database schema
- React frontend with Recharts visualizations
- Express.js REST API

### Architecture
- Monorepo with 4 packages: reporter, shared, backend, frontend
- TypeScript throughout
- Docker Compose for local development
- Tailwind CSS styling

---

## Planned for Future Releases

### v1.2.0
- Password reset functionality
- Team/shared projects (multiple users per project)
- OAuth2 / SSO integration
- Inviting users to projects

### v1.3.0
- Email notifications for performance alerts
- Webhook integration for CI/CD
- Advanced filtering and search
- Custom metric calculations

### v2.0.0
- Custom test phases and timeline analysis
- Performance budgets and SLA tracking
- Historical data comparison and regression analysis
- Mobile app for dashboard
