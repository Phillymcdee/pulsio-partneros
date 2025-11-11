import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifyPassword } from '@/lib/password';
import type { NextAuthConfig } from 'next-auth';
import { NextRequest } from 'next/server';

const authOptions: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Allow linking Google account to existing email account
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user) {
          return null;
        }

        // Find credentials account
        const [account] = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.userId, user.id),
              eq(accounts.provider, 'credentials')
            )
          )
          .limit(1);

        if (!account) {
          return null;
        }

        // Verify password (stored in access_token field as hash)
        const isValid = await verifyPassword(
          credentials.password as string,
          account.access_token || ''
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@partneros.com',
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Allow all sign-ins
      return true;
    },
  },
};

const handler = NextAuth(authOptions);

export async function GET(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  return handler.handlers.GET(request, { params });
}

export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  return handler.handlers.POST(request, { params });
}

export { authOptions };
