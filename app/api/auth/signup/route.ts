import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, accounts } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';
import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

/**
 * POST /api/auth/signup
 * Create a new user account with email/password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = signupSchema.parse(body);

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = createId();
    await db.insert(users).values({
      id: userId,
      email,
      name: name || null,
      emailVerified: null,
    });

    // Create credentials account
    await db.insert(accounts).values({
      userId,
      type: 'credentials',
      provider: 'credentials',
      providerAccountId: userId,
      access_token: passwordHash, // Store password hash in access_token field
      refresh_token: null,
      expires_at: null,
      token_type: null,
      scope: null,
      id_token: null,
      session_state: null,
    });

    return NextResponse.json(
      { message: 'Account created successfully', userId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

