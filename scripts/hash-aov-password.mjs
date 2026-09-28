import { createInterface } from 'node:readline';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { Writable } from 'node:stream';

if (!process.stdin.isTTY) {
  console.error('Run this in an interactive terminal so the password is not saved in shell history.');
  process.exit(1);
}
let muted = false;
const output = new Writable({ write(chunk, encoding, done) { if (!muted) process.stdout.write(chunk, encoding); done(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
process.stdout.write('Current admin.moohsia.com password: ');
muted = true;
const password = await new Promise(resolve => rl.question('', resolve));
muted = false;
process.stdout.write('\n');
rl.close();
if (password.length < 10) {
  console.error('Password must be at least 10 characters. Nothing was saved.');
  process.exit(1);
}
const salt = randomBytes(16);
const digest = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
console.log(`pbkdf2-sha256$100000$${salt.toString('hex')}$${digest.toString('hex')}`);
