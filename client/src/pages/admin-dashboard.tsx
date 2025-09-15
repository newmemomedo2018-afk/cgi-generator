import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  FolderOpen, 
  CreditCard, 
  TrendingUp, 
  Crown, 
  Activity,
  Calendar,
  DollarSign,
  Play
} from "lucide-react";
import type { User as UserType, Project } from "@shared/schema";

interface PlatformStats {
  totalUsers: number;
  totalProjects: number; 
  completedProjects: number;
  totalTransactions: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Become admin mutation
  const becomeAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/make-admin");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "أصبحت أدمن",
        description: "تم منحك صلاحيات الإدارة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin data queries
  const { data: allUsers } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!(user as UserType & { isAdmin?: boolean })?.isAdmin,
  });

  const { data: allProjects } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
    enabled: !!(user as UserType & { isAdmin?: boolean })?.isAdmin,
  });

  const { data: platformStats } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!(user as UserType & { isAdmin?: boolean })?.isAdmin,
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "غير محدد";
    return new Date(date).toLocaleDateString("ar-EG");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-50 glass-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="text-2xl font-bold gradient-text">
                🛡️ لوحة تحكم الأدمن
              </div>
            </div>
            <div className="flex items-center space-x-reverse space-x-4">
              <Badge className="credit-badge px-3 py-1 rounded-full text-sm font-bold text-white">
                <Crown className="ml-2 h-4 w-4" />
                {(user as UserType & { isAdmin?: boolean })?.isAdmin ? "أدمن" : "مستخدم"}
              </Badge>
              <Button 
                onClick={() => window.location.href = "/"}
                variant="outline" 
                className="glass-card"
                data-testid="back-to-dashboard"
              >
                العودة للوحة الرئيسية
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-20">
        <section className="py-12">
          <div className="container mx-auto px-4">
            {!(user as UserType & { isAdmin?: boolean })?.isAdmin ? (
              // Non-admin view - show become admin button
              <div className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-3xl font-bold mb-4">منطقة الأدمن</h2>
                <p className="text-xl text-muted-foreground mb-8">
                  تحتاج صلاحيات الأدمن للوصول لهذه الصفحة
                </p>
                <Button 
                  onClick={() => becomeAdminMutation.mutate()}
                  disabled={becomeAdminMutation.isPending}
                  className="gradient-button"
                  size="lg"
                  data-testid="become-admin-button"
                >
                  <Crown className="ml-2 h-5 w-5" />
                  {becomeAdminMutation.isPending ? "جاري المعالجة..." : "اجعلني أدمن"}
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  (للاختبار فقط - في الإنتاج هتحتاج صلاحيات من قاعدة البيانات)
                </p>
              </div>
            ) : (
              // Admin view - show dashboard
              <>
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-4">لوحة تحكم الأدمن</h2>
                  <p className="text-xl text-muted-foreground">مراقبة وإدارة منصة مولد CGI</p>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="total-users">
                        {platformStats?.totalUsers || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">إجمالي المشاريع</CardTitle>
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="total-projects">
                        {platformStats?.totalProjects || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">المشاريع المكتملة</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="completed-projects">
                        {platformStats?.completedProjects || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">المعاملات المالية</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="total-transactions">
                        {platformStats?.totalTransactions || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Tables */}
                <Tabs defaultValue="users" className="w-full">
                  <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 glass-card p-1">
                    <TabsTrigger value="users" className="data-[state=active]:gradient-button">
                      <Users className="ml-2 h-4 w-4" />
                      المستخدمين
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="data-[state=active]:gradient-button">
                      <FolderOpen className="ml-2 h-4 w-4" />
                      المشاريع
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="users" className="mt-8">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="text-2xl">جميع المستخدمين</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-right py-3">البريد الإلكتروني</th>
                                <th className="text-right py-3">الاسم</th>
                                <th className="text-right py-3">الكريديت</th>
                                <th className="text-right py-3">أدمن</th>
                                <th className="text-right py-3">تاريخ التسجيل</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allUsers?.map((user) => (
                                <tr key={user.id} className="border-b border-white/5">
                                  <td className="py-3" data-testid={`user-email-${user.id}`}>
                                    {user.email}
                                  </td>
                                  <td className="py-3">
                                    {user.firstName} {user.lastName}
                                  </td>
                                  <td className="py-3">
                                    <Badge variant="outline">{user.credits}</Badge>
                                  </td>
                                  <td className="py-3">
                                    {(user as UserType & { isAdmin?: boolean })?.isAdmin ? (
                                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">أدمن</Badge>
                                    ) : (
                                      <Badge variant="secondary">مستخدم</Badge>
                                    )}
                                  </td>
                                  <td className="py-3">{formatDate(user.createdAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="projects" className="mt-8">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="text-2xl">جميع المشاريع</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-right py-3">العنوان</th>
                                <th className="text-right py-3">النوع</th>
                                <th className="text-right py-3">الحالة</th>
                                <th className="text-right py-3">المستخدم</th>
                                <th className="text-right py-3">الكريديت المستخدم</th>
                                <th className="text-right py-3">التاريخ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allProjects?.map((project) => (
                                <tr key={project.id} className="border-b border-white/5">
                                  <td className="py-3" data-testid={`project-title-${project.id}`}>
                                    {project.title}
                                  </td>
                                  <td className="py-3">
                                    <Badge variant="outline">
                                      {project.contentType === "video" ? "فيديو" : "صورة"}
                                    </Badge>
                                  </td>
                                  <td className="py-3">
                                    <Badge 
                                      className={
                                        project.status === "completed" 
                                          ? "bg-gradient-to-r from-green-500 to-blue-500"
                                          : project.status === "failed"
                                          ? "bg-gradient-to-r from-red-500 to-pink-500"
                                          : "bg-gradient-to-r from-orange-500 to-red-500"
                                      }
                                    >
                                      {project.status === "completed" ? "مكتمل" :
                                       project.status === "failed" ? "فاشل" : "قيد المعالجة"}
                                    </Badge>
                                  </td>
                                  <td className="py-3">{project.userId.substring(0, 8)}...</td>
                                  <td className="py-3">{project.creditsUsed}</td>
                                  <td className="py-3">{formatDate(project.createdAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}