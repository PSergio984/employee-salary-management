import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

export async function seed(): Promise<void> {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_URL is required for seeding');
  }

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username) {
    throw new Error(
      'ADMIN_USERNAME environment variable is required and must not be empty for seeding.',
    );
  }

  if (!password || password.trim().length === 0) {
    throw new Error(
      'ADMIN_PASSWORD environment variable is required and must not be empty for seeding.',
    );
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { username },
    });

    if (existingAdmin) {
      console.log(`Admin user "${username}" already exists. Skipping password reset.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.adminUser.create({
      data: {
        username,
        passwordHash,
      },
    });

    console.log(`Successfully created administrator "${admin.username}" (ID: ${admin.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}

// Only execute directly when invoked via CLI (e.g. tsx prisma/seed.ts)
const isMainScript =
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isMainScript) {
  seed().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
}
