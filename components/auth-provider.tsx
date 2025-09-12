'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

type Role = 'Admin' | 'User';
type Credentials = { username?: string; password?: string };
type LoginResult = { success: boolean, message?: string };

interface AuthContextType {
  userRole: Role | null;
  login: (role: Role, credentials?: Credentials) => LoginResult;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/login'];

// Hardcoded admin credentials
const ADMIN_USERNAME = '_mohdnasar';
const ADMIN_PASSWORD = '##naruto';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem('userRole') as Role | null;
      if (storedRole) {
        setUserRole(storedRole);
      }
    } catch (e) {
        console.error("Could not access local storage");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!userRole && !publicPaths.includes(pathname)) {
      router.push('/login');
    } else if (userRole === 'User' && pathname.startsWith('/admin')) {
      router.push('/');
    } else if (userRole === 'Admin' && (pathname === '/' || pathname === '/login')) {
        router.push('/admin');
    }
  }, [userRole, isLoading, pathname, router]);

  const login = (role: Role, credentials?: Credentials): LoginResult => {
    if (role === 'Admin') {
      if (credentials?.username === ADMIN_USERNAME && credentials?.password === ADMIN_PASSWORD) {
        setUserRole(role);
        localStorage.setItem('userRole', role);
        router.push('/admin');
        return { success: true };
      } else {
        return { success: false, message: 'Invalid username or password.' };
      }
    }

    // For 'User' role
    setUserRole(role);
    localStorage.setItem('userRole', role);
    router.push('/');
    return { success: true };
  };

  const logout = () => {
    setUserRole(null);
    localStorage.removeItem('userRole');
    router.push('/login');
  };
  
  if(isLoading) {
    return (
        <div className="main-container space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  // Prevent rendering children on public pages if we are redirecting
  if (!userRole && !publicPaths.includes(pathname)) {
    return null;
  }


  return (
    <AuthContext.Provider value={{ userRole, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
