import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllFaculty } from '@/lib/services';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(getAllFaculty());
}
