'use client';

import { BadgeCheck, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../auth-provider';
import { Button } from '../ui/button';

export function AppHeader() {
  const { userRole, logout } = useAuth();

  return (
    <header className="bg-card border-b sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
             <BadgeCheck className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">AuthenX</h1>
              <p className="text-xs text-muted-foreground">Decentralized Verification</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {userRole && (
              <BadgeCheck className="hidden sm:block">
                <span className="font-semibold">{userRole} Panel</span>
              </BadgeCheck>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent/10 border border-accent/30">
                  <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                  </span>
                  <span className="text-sm text-accent">System Online</span>
            </div>
            {userRole && (
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut className="w-5 h-5" />
              </Button>
            )}
           </div>
        </div>
      </div>
    </header>
  );
}
