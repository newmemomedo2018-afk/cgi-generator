# Environment Variables Setup

## Required Environment Variables

### Database
```bash
DATABASE_URL="postgresql://username:password@hostname:port/database"
```

### AI Services
```bash
# Google Gemini AI
GEMINI_API_KEY="your_gemini_api_key_here"

# Fal.ai for image/video generation
FAL_API_KEY="your_fal_api_key_here"

# PiAPI for audio/video services (Kling AI)
PIAPI_API_KEY="your_piapi_api_key_here"
```

### File Storage
```bash
# Cloudinary for image/video storage
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
```

### Payment Processing
```bash
# Stripe Payment Integration
VITE_STRIPE_PUBLIC_KEY="pk_live_or_test_key"
STRIPE_SECRET_KEY="sk_live_or_test_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

### Authentication
```bash
# JWT Secret for authentication
JWT_SECRET="your_jwt_secret_here"
```

## Getting API Keys

### 1. Gemini AI (Google)
- Visit: https://aistudio.google.com/app/apikey
- Create new API key
- Copy the key value

### 2. Fal.ai
- Visit: https://fal.ai/dashboard
- Go to API Keys section
- Generate new API key

### 3. Cloudinary
- Sign up at: https://cloudinary.com
- Get Cloud Name, API Key, API Secret from dashboard

### 4. Stripe
- Sign up at: https://stripe.com
- Get publishable key (starts with pk_)
- Get secret key (starts with sk_)
- Set up webhook endpoint for: /api/webhooks/stripe

### 5. Database (Neon)
- Sign up at: https://neon.tech
- Create new database
- Copy connection string

## Vercel Environment Variables

In Vercel dashboard:
1. Go to Project Settings
2. Navigate to Environment Variables
3. Add all variables above
4. Set Environment: Production (or Preview/Development as needed)

## Local Development

Create `.env` file in project root:
```bash
cp .env.example .env
# Edit .env with your values
```