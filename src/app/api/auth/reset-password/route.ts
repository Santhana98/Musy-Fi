import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. Basic validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // 2. Password length verification (must be at least 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // 3. Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email does not exist in the system.' },
        { status: 400 }
      );
    }

    // 4. Securely hash the password using PBKDF2 (assumed by NextAuth verifyPassword)
    const hashedPassword = hashPassword(password);

    // 5. Update password in user model
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log(`[Reset Password] Direct reset succeeded for email: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });

  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
