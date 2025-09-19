import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, Rocket, Crown, Building, TestTube } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Pricing() {
  const { isAuthenticated } = useAuth();

  const handlePurchase = (packageType: string) => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    // TODO: Implement Stripe checkout
    console.log("Purchase package:", packageType);
  };

  const packages = [
    {
      id: "tester",
      name: "التيستر",
      icon: <TestTube className="h-8 w-8" />,
      price: 10,
      credits: 100,
      features: [
        "100 كريدت",
        "صور CGI عالية الجودة (1024x1024)",
        "فيديوهات قصيرة (5 ثواني)",
        "دعم فني عبر الإيميل",
        "صالح لمدة 6 أشهر",
      ],
      popular: false,
    },
    {
      id: "starter",
      name: "المبتدئ",
      icon: <Rocket className="h-8 w-8" />,
      price: 25,
      credits: 250,
      features: [
        "250 كريدت",
        "صور CGI عالية الجودة (1024x1024)",
        "فيديوهات قصيرة وطويلة",
        "دعم فني سريع",
        "صالح لمدة 6 أشهر",
      ],
      popular: false,
    },
    {
      id: "pro",
      name: "المحترف",
      icon: <Star className="h-8 w-8" />,
      price: 50,
      credits: 550,
      features: [
        "550 كريدت (10% مجاناً)",
        "صور CGI عالية الجودة (1024x1024)",
        "فيديوهات بدون حدود",
        "أولوية في المعالجة",
        "دعم فني متقدم",
        "صالح لمدة 12 شهر",
      ],
      popular: true,
    },
    {
      id: "business",
      name: "الأعمال",
      icon: <Building className="h-8 w-8" />,
      price: 100,
      credits: 1200,
      features: [
        "1200 كريدت (20% مجاناً)",
        "صور CGI عالية الجودة (1024x1024)",
        "فيديوهات بدون حدود",
        "معالجة فورية",
        "دعم فني مخصص",
        "صالح لمدة 12 شهر",
      ],
      popular: false,
    },
  ];

  const features = [
    { name: "عدد الكريدت", tester: "100", starter: "250", pro: "550", business: "1200" },
    { name: "دقة الصور", tester: "1024x1024", starter: "1024x1024", pro: "1024x1024", business: "1024x1024" },
    { name: "الصور", tester: "2 كريدت", starter: "2 كريدت", pro: "2 كريدت", business: "2 كريدت" },
    { name: "الفيديوهات القصيرة (5s)", tester: "10 كريدت", starter: "10 كريدت", pro: "10 كريدت", business: "10 كريدت" },
    { name: "الفيديوهات الطويلة (10s)", tester: "18 كريدت", starter: "18 كريدت", pro: "18 كريدت", business: "18 كريدت" },
    { name: "أولوية المعالجة", tester: false, starter: false, pro: true, business: true },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-50 glass-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="text-2xl font-bold gradient-text">
                🎬 مولد CGI
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-reverse space-x-8">
              <a href="/" className="text-sm font-medium hover:text-primary transition-colors">الرئيسية</a>
              <a href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">لوحة التحكم</a>
              <a href="/pricing" className="text-sm font-medium text-primary">الأسعار</a>
            </nav>
            <div className="flex items-center space-x-reverse space-x-4">
              {isAuthenticated ? (
                <Button onClick={() => window.location.href = "/dashboard"} className="gradient-button">
                  لوحة التحكم
                </Button>
              ) : (
                <Button onClick={() => window.location.href = "/api/login"} className="gradient-button">
                  تسجيل الدخول
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="pt-20">
        {/* Pricing Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">باقات الأسعار</h2>
              <p className="text-xl text-muted-foreground mb-8">اختر الباقة المناسبة لاحتياجاتك</p>
              
              {/* Credit Packages Description */}
              <div className="text-center mb-8">
                <p className="text-lg text-muted-foreground">
                  اشتري كريدت واستخدمها متى شئت - صالحة لمدة 6-12 شهر
                </p>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={`glass-card relative ${pkg.popular ? "border-2 border-primary" : ""}`}
                  data-testid={`package-${pkg.id}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 right-1/2 transform translate-x-1/2">
                      <Badge className="gradient-button">الأكثر شعبية</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 text-primary">{pkg.icon}</div>
                    <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                    <div className="text-4xl font-bold mb-2">${pkg.price}</div>
                    <p className="text-muted-foreground">لمرة واحدة</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handlePurchase(pkg.id)}
                      className={pkg.popular ? "w-full gradient-button" : "w-full bg-secondary hover:bg-secondary/80"}
                      data-testid={`purchase-${pkg.id}`}
                    >
                      اختيار الباقة
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Feature Comparison Table */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl text-center">مقارنة المميزات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="feature-comparison-table">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-4 text-right">المميزة</th>
                        <th className="p-4">التيستر</th>
                        <th className="p-4">المبتدئ</th>
                        <th className="p-4">المحترف</th>
                        <th className="p-4">الأعمال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((feature, index) => (
                        <tr key={index} className="border-b border-border">
                          <td className="p-4 font-medium">{feature.name}</td>
                          <td className="p-4 text-center">
                            {typeof feature.tester === "boolean" ? (
                              feature.tester ? (
                                <Check className="h-4 w-4 text-primary mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )
                            ) : (
                              feature.tester
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {typeof feature.starter === "boolean" ? (
                              feature.starter ? (
                                <Check className="h-4 w-4 text-primary mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )
                            ) : (
                              feature.starter
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {typeof feature.pro === "boolean" ? (
                              feature.pro ? (
                                <Check className="h-4 w-4 text-primary mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )
                            ) : (
                              feature.pro
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {typeof feature.business === "boolean" ? (
                              feature.business ? (
                                <Check className="h-4 w-4 text-primary mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )
                            ) : (
                              feature.business
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className="glass-card mt-12">
              <CardHeader>
                <CardTitle className="text-2xl text-center">الأسئلة الشائعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer">
                      <span className="font-medium">ما هو نظام الكريدت؟</span>
                      <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </summary>
                    <p className="mt-4 text-muted-foreground">
نظام الكريدت هو طريقة بسيطة للدفع مقابل استخدام خدمات CGI. كل صورة تكلف 2 كريدت، وكل فيديو قصير يكلف 10 كريدت، والفيديو الطويل يكلف 18 كريدت.
                    </p>
                  </details>
                  
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer">
                      <span className="font-medium">هل تنتهي صلاحية الكريدت؟</span>
                      <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </summary>
                    <p className="mt-4 text-muted-foreground">
الكريدت صالح لمدة 6 أشهر للباقات الصغيرة، و12 شهر للباقات الكبيرة. لا يوجد اشتراك شهري - تشتري الكريدت مرة واحدة وتستخدمه عند الحاجة.
                    </p>
                  </details>
                  
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer">
                      <span className="font-medium">ما هي أنواع الملفات المدعومة؟</span>
                      <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </summary>
                    <p className="mt-4 text-muted-foreground">
                      ندعم جميع أنواع الصور الشائعة مثل PNG، JPG، JPEG، وWEBP. حجم الملف الأقصى هو 10 ميجابايت.
                    </p>
                  </details>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
