# 🚀 GitHub + Vercel + Domain Setup Guide

## Step 1: GitHub Repository Setup

### 1.1 Create GitHub Repository
```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit initial code
git commit -m "Initial commit: CGI Generator SaaS ready for deployment"

# Add GitHub remote origin
git remote add origin https://github.com/yourusername/cgi-generator.git

# Push to GitHub
git push -u origin main
```

### 1.2 Repository Settings
- **Repository name**: `cgi-generator`
- **Visibility**: Private (recommended for SaaS)
- **Branch protection**: Enable for `main` branch
- **Secrets**: Store sensitive environment variables

## Step 2: Vercel Deployment

### 2.1 Connect Vercel to GitHub
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your `cgi-generator` repository
5. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `npm install`

### 2.2 Environment Variables in Vercel
Go to Project Settings → Environment Variables and add:

#### Required for Production:
```bash
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# AI Services
GEMINI_API_KEY=your_gemini_api_key
FAL_API_KEY=your_fal_api_key

# File Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Payments
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Authentication
JWT_SECRET=your_secure_jwt_secret_minimum_32_chars
```

## Step 3: Custom Domain Setup (cgi-generator.com)

### 3.1 Vercel Domain Configuration
1. In Vercel project dashboard → Settings → Domains
2. Add custom domain: `cgi-generator.com`
3. Add www redirect: `www.cgi-generator.com` → `cgi-generator.com`
4. Copy the DNS records provided by Vercel

### 3.2 Namecheap DNS Setup
1. Login to Namecheap account
2. Go to Domain List → Manage (for cgi-generator.com)
3. Advanced DNS tab
4. Add these records:
   ```
   Type: A Record
   Host: @
   Value: 76.76.19.61 (Vercel IP)
   TTL: Automatic

   Type: CNAME Record  
   Host: www
   Value: cname.vercel-dns.com
   TTL: Automatic
   ```

### 3.3 SSL Certificate
- Vercel automatically provisions SSL certificates
- Wait 24-48 hours for full propagation
- Test with: `https://cgi-generator.com`

## Step 4: Stripe Webhook Configuration

### 4.1 Update Stripe Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Developers → Webhooks
3. Update endpoint URL to: `https://cgi-generator.com/api/webhooks/stripe`
4. Events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### 4.2 Test Payments
- Use Stripe test mode first
- Test card: `4242 4242 4242 4242`
- Verify credit fulfillment works

## Step 5: Database Migration

### 5.1 Production Database Setup
1. Create production PostgreSQL database (Neon/Supabase)
2. Update `DATABASE_URL` in Vercel environment variables
3. Run database migration:
   ```bash
   # Connect to production database
   npm run db:push --force
   ```

### 5.2 Verify Database Schema
Ensure these tables exist:
- `users` (authentication & credits)
- `projects` (CGI generation history)
- `transactions` (payment history)
- `job_queue` (async processing)

## Step 6: Post-Deployment Testing

### 6.1 Core Functionality Test
- [ ] User registration/login
- [ ] Credit package purchase
- [ ] Image generation (2 credits)
- [ ] Video generation (10 credits)
- [ ] Download generated content

### 6.2 Payment Flow Test
- [ ] Stripe payment intent creation
- [ ] Webhook credit fulfillment
- [ ] Credit balance updates

### 6.3 Performance Monitoring
- [ ] Check Vercel function logs
- [ ] Monitor AI service quotas
- [ ] Verify Cloudinary uploads

## Step 7: Go Live Checklist

### 7.1 Final Preparations
- [ ] Update Stripe to live mode
- [ ] Switch AI services to production
- [ ] Test all user journeys
- [ ] Monitor error rates

### 7.2 Launch
- [ ] DNS propagation complete
- [ ] SSL certificate active
- [ ] All tests passing
- [ ] **🚀 CGI Generator is LIVE at https://cgi-generator.com**

## Rollback Plan

If issues arise:
1. Revert Vercel deployment to previous version
2. Update DNS to maintenance page
3. Check GitHub commits for working version
4. Redeploy stable version

## Support & Monitoring

- **Logs**: Vercel Dashboard → Functions → View Logs
- **Database**: Monitor connection limits
- **Payments**: Stripe Dashboard analytics
- **Domain**: DNS propagation checker tools