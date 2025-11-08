import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

export async function getSession() {
  // For NextAuth v5 beta, we need to use getToken with cookies
  const cookieStore = await cookies();
  const token = await getToken({ 
    req: {
      headers: {
        cookie: cookieStore.toString(),
      },
    } as any,
    secret: process.env.AUTH_SECRET,
  });
  
  if (!token) return null;
  
  return {
    user: {
      id: token.sub,
      email: token.email,
      name: token.name,
      image: token.picture,
    },
    expires: new Date(token.exp! * 1000).toISOString(),
  };
}

export async function getCurrentUser() {
  try {
    const session = await getSession();
    return session?.user ? { ...session.user, id: session.user.id || session.user.email } : null;
  } catch (error) {
    return null;
  }
}
