import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createFaculty,
  deleteFaculty,
  createStudent,
  deleteStudent,
  createSubject,
  deleteSubject,
} from '@/lib/services';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { entity, action, data } = body;

  try {
    switch (entity) {
      case 'faculty':
        if (action === 'create') {
          const result = createFaculty(data);
          return NextResponse.json({ success: true, token: result.token });
        }
        if (action === 'delete') {
          deleteFaculty(data.id);
          return NextResponse.json({ success: true });
        }
        break;
      case 'student':
        if (action === 'create') {
          createStudent({ ...data, sap: parseInt(data.sap, 10), rollno: parseInt(data.rollno, 10), year: parseInt(data.year, 10) });
          return NextResponse.json({ success: true });
        }
        if (action === 'delete') {
          deleteStudent(data.sap);
          return NextResponse.json({ success: true });
        }
        break;
      case 'subject':
        if (action === 'create') {
          createSubject(data.name, parseInt(data.year, 10));
          return NextResponse.json({ success: true });
        }
        if (action === 'delete') {
          deleteSubject(data.id);
          return NextResponse.json({ success: true });
        }
        break;
    }
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
