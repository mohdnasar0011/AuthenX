'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { User, Shield, AlertTriangle } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login('Admin', { username, password });
    if (!result.success) {
      setError(result.message || 'Invalid credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md bg-card shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">AuthenX</CardTitle>
          <CardDescription>Please select your role to proceed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* User Panel */}
          <div className="text-center">
             <Button
              variant="outline"
              className="h-24 w-full flex-col gap-2"
              onClick={() => login('User')}
            >
              <User className="w-8 h-8" />
              <span className="text-lg">Verify Your Documents</span>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Proceed as a user to verify certificates</p>
          </div>

          <div className="flex items-center text-xs text-muted-foreground">
              <Separator className="flex-1" />
              <span className="px-4">OR</span>
              <Separator className="flex-1" />
          </div>

          {/* Admin Panel */}
          <div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5"/>
                  Admin Panel Login
                </h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
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
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full">
                Login as Admin
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
