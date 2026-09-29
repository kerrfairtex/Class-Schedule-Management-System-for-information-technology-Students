import { NextResponse } from 'next/server';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { verifyPassword, getUserById } from '@/lib/modules/mod-01-auth/service';
import { changePassword } from '@/lib/modules/mod-01-auth/session';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';
import z from 'zod';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }

  const user = getUserById(session.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  try {
    await changePassword(session.id, newPassword);
    logAudit(session.id, 'CHANGE_PASSWORD', 'user', session.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
