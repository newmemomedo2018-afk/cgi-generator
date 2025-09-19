# 🚨 Critical Deployment Notes

## Replit Dependencies Challenge

### The Issue
The `vite.config.ts` file is protected and cannot be edited. It contains imports for Replit-specific plugins that must be present for the application to run in development mode.

### Current State
- **Development (Replit)**: Requires these packages installed:
  - `@replit/vite-plugin-runtime-error-modal`
  - `@replit/vite-plugin-cartographer` 
  - `@replit/vite-plugin-dev-banner`

### External Deployment Strategy
For production deployment (Vercel):

1. **Conditional Loading**: The vite.config.ts has conditional logic:
   ```javascript
   process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
   ```
   
2. **Environment Variables**: On Vercel, `REPL_ID` will be undefined, so the Replit-specific plugins should not load.

3. **Build Process**: The build command `npm run build` should work on Vercel without these packages because:
   - `NODE_ENV=production` in Vercel
   - `REPL_ID` is undefined outside of Replit

### Pre-deployment Steps
Before pushing to GitHub:

1. **Test Build Locally**:
   ```bash
   NODE_ENV=production npm run build
   ```

2. **Verify No Replit Dependencies in Build**: The conditional imports should prevent loading Replit plugins in production.

3. **Consider Removing for GitHub**: If deployment fails, these packages may need to be removed from package.json before GitHub push.

### Fallback Plan
If Vercel deployment fails due to Replit dependencies:

1. Create a production branch without Replit dependencies
2. Remove packages from package.json:
   ```bash
   npm uninstall @replit/vite-plugin-runtime-error-modal @replit/vite-plugin-cartographer @replit/vite-plugin-dev-banner
   ```
3. Deploy from the production branch

### Security Note  
- ✅ All hardcoded secrets removed from documentation and code
- ✅ Webhook secret must be set in Vercel environment variables: `STRIPE_WEBHOOK_SECRET`
- 🚨 **CRITICAL BEFORE GO-LIVE**: Real webhook secret was previously exposed in code
  - **MUST rotate webhook secret** in Stripe dashboard immediately before production
  - **MUST update STRIPE_WEBHOOK_SECRET** in Vercel environment variables with new secret
  - **MUST test webhook** with Stripe CLI after rotation to confirm 2xx response
- ✅ Application now properly validates environment variables at startup
- ✅ Database migration confirmed: processedAt and updatedAt fields applied
- ✅ Vercel routing confirmed: /api routes properly configured

## Serverless Handler Fix

### The Solution
Modified `server/index.ts` to support both local development and Vercel serverless:

```typescript
// Conditional deployment mode
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  // Export serverless handler for Vercel
  module.exports = serverless(app);
  module.exports.default = serverless(app);
} else {
  // Start regular Express server for local development
  server.listen({ port, host: "0.0.0.0" });
}
```

### Dependencies Added
- `serverless-http`: Wraps Express app for Vercel compatibility

## Current Application Status
- ✅ **Working**: Application runs successfully on port 5000
- ✅ **Serverless Ready**: Vercel-compatible handler exported
- ✅ **Database**: PostgreSQL connection active
- ✅ **API**: All endpoints responding
- ✅ **Authentication**: JWT system functional
- ✅ **Payments**: Stripe integration ready
- ✅ **Generation**: AI services integrated
- ✅ **Security**: No secrets in documentation or git
- ✅ **Environment**: All variables documented