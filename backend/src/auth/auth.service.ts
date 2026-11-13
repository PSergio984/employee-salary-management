import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ValidatedUser {
  id: number;
  username: string;
  createdAt: Date;
}

export interface SessionResult {
  rawSecret: string;
  expiresAt: Date;
  sessionId: string;
}

export interface ActiveSession {
  id: string;
  adminUserId: number;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  adminUser: ValidatedUser;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { username },
    });

    if (!admin) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      createdAt: admin.createdAt,
    };
  }

  async createSession(adminUserId: number): Promise<SessionResult> {
    // 32 cryptographically random bytes = 256 bits of entropy
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const now = new Date();
    // Fixed eight-hour server lifetime: 8 * 60 * 60 * 1000 ms
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const session = await this.prisma.authSession.create({
      data: {
        adminUserId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      rawSecret,
      expiresAt,
      sessionId: session.id,
    };
  }

  async validateSession(rawSecret: string): Promise<ActiveSession | null> {
    if (!rawSecret || typeof rawSecret !== 'string') {
      return null;
    }

    const tokenHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const now = new Date();

    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        adminUser: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
      },
    });

    return session;
  }

  async revokeSession(rawSecret: string): Promise<void> {
    if (!rawSecret || typeof rawSecret !== 'string') {
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    await this.prisma.authSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
