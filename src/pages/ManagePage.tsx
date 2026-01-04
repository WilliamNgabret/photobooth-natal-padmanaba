import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Lock, Loader2, LogOut, Image, Sticker, TreePine } from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GalleryGrid } from '@/components/GalleryGrid';
import { StickerManager } from '@/components/StickerManager';

export default function ManagePage() {
  const location = useLocation();
  
  // Determine initial tab from URL
  const getInitialTab = () => {
    if (location.pathname.includes('/manage/stickers')) return 'stickers';
    return 'gallery';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      } else if (session) {
        const isAdmin = await api.admin.isAdmin();
        setIsAuthenticated(isAdmin);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    const valid = await api.admin.verify();
    setIsAuthenticated(valid);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoginLoading(true);
    try {
      await api.admin.login(email, password);
      setIsAuthenticated(true);
      toast.success('Logged in successfully');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
      setPassword('');
    }
  };

  const handleLogout = async () => {
    await api.admin.logout();
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
            <p className="mt-2 text-muted-foreground">Sign in with your admin account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-touch" 
              disabled={loginLoading || !email.trim() || !password.trim()}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Photobooth
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <TreePine className="w-5 h-5 text-secondary" />
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="gallery" className="gap-2">
              <Image className="w-4 h-4" /> Gallery
            </TabsTrigger>
            <TabsTrigger value="stickers" className="gap-2">
              <Sticker className="w-4 h-4" /> Stickers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery">
            <GalleryGrid />
          </TabsContent>

          <TabsContent value="stickers">
            <StickerManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
