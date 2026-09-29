import { getDb } from '../lib/persistence/db';
import { hashPassword } from '../lib/modules/mod-01-auth/service';
import { logAudit } from '../lib/modules/mod-08-database-service/audit';
import * as readline from 'readline';

/**
 * Emergency password reset script.
 * 
 * Usage: npx tsx scripts/reset-passwords.ts <username>
 * 
 * This script resets a single user's password to a cryptographically
 * secure random password and sets must_change_password = 1.
 * 
 * SAFETY: This script only accepts a single username as an argument.
 * It cannot be used for mass resets.
 */

function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: npx tsx scripts/reset-passwords.ts <username>');
    console.error('This script resets a single user password. It cannot be used for mass resets.');
    process.exit(1);
  }

  const username = args[0];
  
  const db = getDb();
  const user = db.prepare('SELECT id, username, role FROM users WHERE username = ?').get(username) as { id: number; username: string; role: string } | undefined;
  
  if (!user) {
    console.error(`User not found: ${username}`);
    process.exit(1);
  }

  const newPassword = generateSecurePassword(16);
  const hash = hashPassword(newPassword);
  
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hash, user.id);
  
  logAudit(null, 'EMERGENCY_RESET', 'user', user.id, `Password reset for ${username}`);
  
  console.log(`Password reset for user: ${username}`);
  console.log(`New password: ${newPassword}`);
  console.log('IMPORTANT: Share this password securely. It will not be shown again.');
  console.log('The user will be forced to change this password on next login.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
