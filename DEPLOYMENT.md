# 🚀 نشر مولد CGI على Vercel

## إعداد الأساسي

### 1. متطلبات النشر
- حساب Vercel
- قاعدة بيانات PostgreSQL (يفضل Neon أو Supabase)
- مفاتيح API للخدمات المطلوبة

### 2. متغيرات البيئة المطلوبة في Vercel

قم بإضافة هذه المتغيرات في إعدادات مشروع Vercel:

#### قاعدة البيانات
```
DATABASE_URL=postgresql://username:password@host:5432/database
PGHOST=your-db-host
PGPORT=5432
PGDATABASE=your-database-name
PGUSER=your-username
PGPASSWORD=your-password
```

#### المصادقة والجلسة
```
JWT_SECRET=your-secure-jwt-secret
SESSION_SECRET=your-secure-session-secret
```

#### تخزين الملفات
```
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
PRIVATE_OBJECT_DIR=/tmp
PUBLIC_OBJECT_SEARCH_PATHS=/tmp/public
```

#### خدمات الذكاء الاصطناعي
```
FAL_API_KEY=your-fal-api-key
GEMINI_API_KEY=your-gemini-api-key
PIAPI_API_KEY=your-piapi-api-key
```

#### Stripe للمدفوعات
```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 3. خطوات النشر

1. **ربط المستودع بـ Vercel**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

2. **إعداد قاعدة البيانات**
   - أنشئ قاعدة بيانات PostgreSQL جديدة
   - نفّذ الاستعلام لإنشاء الجداول (راجع shared/schema.ts)

3. **اختبار النشر**
   - تحقق من أن جميع المتغيرات مضبوطة
   - اختبر endpoints الأساسية
   - تحقق من اتصال قاعدة البيانات

### 4. مراقبة ما بعد النشر

- راقب logs في Vercel Dashboard
- اختبر تسجيل الدخول والخروج  
- اختبر إنشاء مشروع واحد للتأكد من الوظائف
- تحقق من Stripe webhooks في لوحة تحكم Stripe

### 5. نصائح الأداء

- استخدم تخزين سحابي حقيقي بدلاً من /tmp (مؤقت في Vercel)
- راجع حدود استخدام API للخدمات المدفوعة
- اضبط timeout للوظائف حسب الحاجة

## مشاكل شائعة وحلولها

### مشكلة: "Database connection failed"
- تحقق من صحة DATABASE_URL
- تأكد أن قاعدة البيانات تسمح بالاتصالات الخارجية

### مشكلة: "File upload fails" 
- /tmp في Vercel مؤقت، استخدم S3 أو Google Cloud Storage
- تحقق من حدود حجم الملفات

### مشكلة: "Stripe webhook fails"
- تأكد من أن STRIPE_WEBHOOK_SECRET صحيح
- اضبط endpoint URL في Stripe Dashboard

## بدائل الاستضافة

### Hostinger (خطة احتياطية)
- استضافة VPS مع Node.js
- إعداد Nginx للـ reverse proxy
- استخدم PM2 لإدارة العمليات

### Railway أو Render
- بدائل أخرى لـ Vercel
- دعم جيد لـ Node.js والقواعد
- أسهل في إعداد تخزين الملفات