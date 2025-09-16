import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Play, Camera, Bot, Film, Star, Check } from "lucide-react";
import { AuthDialog } from "@/components/auth/AuthDialog";

export default function Landing() {
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
              <a href="#home" className="text-sm font-medium hover:text-primary transition-colors">الرئيسية</a>
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">المميزات</a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">الأسعار</a>
            </nav>
            <div className="flex items-center space-x-reverse space-x-4">
              <AuthDialog>
                <Button className="gradient-button" data-testid="login-button">
                  <i className="fas fa-user mr-2"></i>
                  تسجيل الدخول
                </Button>
              </AuthDialog>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-20">
        {/* Hero Section */}
        <section id="home" className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              اصنع صور وفيديوهات
              <span className="gradient-text block">
                CGI احترافية
              </span>
              بالذكاء الاصطناعي
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              ارفع صورة منتجك وصورة المشهد واتركنا ندمجهم في صورة أو فيديو CGI احترافي باستخدام أحدث تقنيات الذكاء الاصطناعي
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <AuthDialog defaultTab="register">
                <Button 
                  size="lg" 
                  className="gradient-button"
                  data-testid="start-free-button"
                >
                  <Rocket className="ml-2 h-5 w-5" />
                  ابدأ الآن مجاناً
                </Button>
              </AuthDialog>
              <Button 
                variant="outline" 
                size="lg" 
                className="glass-card hover:bg-white/20 text-white border-white/20"
                data-testid="watch-demo-button"
              >
                <Play className="ml-2 h-5 w-5" />
                شاهد كيف يعمل
              </Button>
            </div>

            {/* How it works */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <Card className="glass-card text-center">
                <CardContent className="p-8">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-4">ارفع الصور</h3>
                  <p className="text-muted-foreground">ارفع صورة منتجك وصورة المشهد المطلوب</p>
                </CardContent>
              </Card>
              <Card className="glass-card text-center">
                <CardContent className="p-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-accent" />
                  <h3 className="text-xl font-bold mb-4">معالجة ذكية</h3>
                  <p className="text-muted-foreground">الذكاء الاصطناعي يحلل ويدمج المحتوى بدقة</p>
                </CardContent>
              </Card>
              <Card className="glass-card text-center">
                <CardContent className="p-8">
                  <Film className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-4">نتيجة احترافية</h3>
                  <p className="text-muted-foreground">احصل على صورة أو فيديو CGI بجودة عالية</p>
                </CardContent>
              </Card>
            </div>

            {/* Before/After Examples */}
            <Card className="glass-card">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-8">أمثلة على النتائج</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold mb-4">قبل - الصور الأصلية</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <img 
                        src="https://via.placeholder.com/400x300/6366f1/ffffff?text=Product+Image" 
                        alt="منتج - هاتف ذكي" 
                        className="rounded-lg shadow-lg"
                        data-testid="example-product-image"
                      />
                      <img 
                        src="https://via.placeholder.com/400x300/8b5cf6/ffffff?text=Scene+Image" 
                        alt="مشهد - غرفة معيشة عصرية" 
                        className="rounded-lg shadow-lg"
                        data-testid="example-scene-image"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-4">بعد - النتيجة النهائية</h4>
                    <img 
                      src="https://via.placeholder.com/600x400/10b981/ffffff?text=CGI+Result" 
                      alt="نتيجة CGI - هاتف مدمج في المشهد" 
                      className="rounded-lg shadow-lg w-full"
                      data-testid="example-result-image"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">مميزات منصة مولد CGI</h2>
              <p className="text-xl text-muted-foreground">تقنيات متقدمة لإنتاج محتوى CGI احترافي</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Badge className="credit-badge">جديد</Badge>
                    <h3 className="text-lg font-bold mr-2">Fal.ai FLUX Schnell</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">أسرع إنتاج للصور بتكلفة $0.003 فقط لكل صورة</p>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 ml-1" />
                    <span className="text-sm">أسرع بـ 4 مرات</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Badge className="credit-badge">محسن</Badge>
                    <h3 className="text-lg font-bold mr-2">Kling AI عبر PiAPI</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">فيديوهات CGI بجودة سينمائية بتكلفة $0.13 لكل فيديو</p>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 ml-1" />
                    <span className="text-sm">جودة 4K</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Badge className="credit-badge">ذكي</Badge>
                    <h3 className="text-lg font-bold mr-2">Google Gemini AI</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">تحسين أوتوماتيكي لوصف المشاريع لنتائج أفضل</p>
                  <div className="flex items-center">
                    <Bot className="h-4 w-4 text-blue-500 ml-1" />
                    <span className="text-sm">تحسين ذكي</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <Card className="glass-card">
              <CardContent className="p-12">
                <h2 className="text-4xl font-bold mb-4">جاهز لإنشاء محتوى CGI مذهل؟</h2>
                <p className="text-xl text-muted-foreground mb-8">
                  ابدأ بـ 5 كريدت مجانية واكتشف قوة الذكاء الاصطناعي
                </p>
                <AuthDialog defaultTab="register">
                  <Button 
                    size="lg" 
                    className="gradient-button"
                    data-testid="cta-start-button"
                  >
                    <Rocket className="ml-2 h-5 w-5" />
                    ابدأ مجاناً الآن
                  </Button>
                </AuthDialog>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 mt-20">
          <div className="container mx-auto px-4">
            <Card className="glass-card">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                  <div>
                    <div className="text-2xl font-bold gradient-text mb-4">
                      🎬 مولد CGI
                    </div>
                    <p className="text-muted-foreground">
                      منصة احترافية لإنتاج صور وفيديوهات CGI بالذكاء الاصطناعي
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4">المنتج</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li><a href="#" className="hover:text-white transition-colors">المميزات</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">الأسعار</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">الوثائق</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4">الشركة</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li><a href="#" className="hover:text-white transition-colors">من نحن</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">المدونة</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">وظائف</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">اتصل بنا</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4">الدعم</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li><a href="#" className="hover:text-white transition-colors">مركز المساعدة</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">الأسئلة الشائعة</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">الدعم الفني</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">الحالة</a></li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center">
                  <p className="text-muted-foreground text-sm mb-4 md:mb-0">
                    © 2024 مولد CGI. جميع الحقوق محفوظة.
                  </p>
                  <div className="flex space-x-reverse space-x-6">
                    <a href="#" className="text-muted-foreground hover:text-white transition-colors">
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-white transition-colors">
                      <i className="fab fa-instagram"></i>
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-white transition-colors">
                      <i className="fab fa-linkedin"></i>
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-white transition-colors">
                      <i className="fab fa-youtube"></i>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </footer>
      </div>
    </div>
  );
}
