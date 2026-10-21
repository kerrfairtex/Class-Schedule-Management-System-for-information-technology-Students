import { NextResponse } from 'next/server';
import fs from 'fs';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { listBackups, resolveBackupPath } from '@/lib/modules/mod-08-database-service/backup';

/**
 * GET  /api/admin/backups           -> list available backup files
 * GET  /api/admin/backups?file=NAME -> download one backup file
 *
 * Render's free tier has no persistent disk, so backups live in the
 * container filesystem and disappear on redeploy. This route is what makes
 * a backup reachable: the admin can download the file straight away.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const fileName = url.searchParams.get('file');

  if (!fileName) {
    const files = listBackups().map((name) => {
      const resolved = resolveBackupPath(name);
      const size = resolved ? fs.statSync(resolved).size : 0;
      return {
        name,
        size,
        modifiedAt: resolved ? fs.statSync(resolved).mtime.toISOString() : null,
      };
    });
    return NextResponse.json({ files });
  }

  const resolved = resolveBackupPath(fileName);
  if (!resolved) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }

  const contents = fs.readFileSync(resolved);
  const contentType = fileName.endsWith('.json') ? 'application/json' : 'application/octet-stream';
  return new NextResponse(new Uint8Array(contents), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(contents.length),
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
