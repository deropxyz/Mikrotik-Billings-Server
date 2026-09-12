import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { DATABASE_TOKEN } from '../db/db.module.js';
import { users } from '../db/schema.js';
import type { Database } from '../db/index.js';
import type { LoginDto } from './dto/login.dto.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login user dengan email dan password.
   * Hanya user dengan role ADMIN dan isActive = true yang boleh login.
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    // 1. Cari user berdasarkan email
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 2. Cek apakah akun aktif
    if (!user.isActive) {
      throw new UnauthorizedException('Akun telah dinonaktifkan');
    }

    // 3. Verifikasi role admin
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 4. Verifikasi password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 5. Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // 6. Return response tanpa passwordHash
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
