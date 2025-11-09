import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isOnboardingComplete } from '@/lib/onboarding';

/**
 * Middleware to protect routes and redirect incomplete onboarding
 * 
 * Protected routes (require onboarding):
 * - /dashboard
 * - /partners (except /partners/import)
 * - /objectives
 * - /settings
 * 
 * Public routes (always accessible):
 * - /auth/*
 * - /onboarding
 * - /api/*
 * - / (homepage handles its own redirect)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname === '/onboarding' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Allow partner import during onboarding
  if (pathname === '/partners/import') {
    return NextResponse.next();
  }

  // Check authentication
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token?.sub) {
    // Not authenticated - redirect to sign in
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check onboarding status for protected routes
  const protectedRoutes = ['/dashboard', '/partners', '/objectives', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    try {
      const onboardingComplete = await isOnboardingComplete(token.sub);
      
      if (!onboardingComplete) {
        // Onboarding incomplete - redirect to onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    } catch (error) {
      // If there's an error checking onboarding, allow access
      // (better UX than blocking users)
      console.error('Error checking onboarding status:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

