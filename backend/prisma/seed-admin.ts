import * as readline from 'node:readline';
import { Writable } from 'node:stream';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

function askVisible(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function askHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    process.stdout.write(query);
    muted = true;

    rl.question('', (ans) => {
      muted = false;
      process.stdout.write('\n');
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log('========================================================');
  console.log('  MST Tengapal — Create / Update Admin Account');
  console.log('========================================================');
  console.log('All passwords will be securely hashed with Argon2id.');
  console.log('No passwords will be displayed, logged, or stored in plaintext.\n');

  let username = '';
  while (!username) {
    username = await askVisible('Enter admin username: ');
    username = username.toLowerCase().trim();
    if (!username) {
      console.log('❌ Username cannot be empty.');
    }
  }

  let password = '';
  while (!password) {
    password = await askHidden('Enter admin password (min 8 chars): ');
    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters long.');
      password = '';
      continue;
    }

    const confirm = await askHidden('Confirm admin password: ');
    if (password !== confirm) {
      console.log('❌ Passwords do not match. Please try again.');
      password = '';
      continue;
    }
  }

  console.log('\nHashing password with Argon2id...');
  const passwordHash = await hash(password);

  console.log('Saving admin account in database...');
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      username,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`\n✅ Admin account "${user.username}" configured successfully! (User ID: ${user.id})`);
  console.log('You can now use these credentials to log in to MST Tengapal.\n');
}

main()
  .catch((err) => {
    console.error('❌ Failed to configure admin account:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
