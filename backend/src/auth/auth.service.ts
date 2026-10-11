import { HttpException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { PG, REDIS } from '../infra.module.js';
import { hashPassword, verifyPassword } from './password.js';

export const COOKIE = 'sid';
export const SESSION_TTL = 60 * 60 * 24 * 7; // 7 días
const MAX_FALLOS = 5;
const BLOQUEO_SEG = 15 * 60;

export interface SesionUsuario {
  uid: number;
  email: string;
}

@Injectable()
export class AuthService {
  private dummyHash = hashPassword('contraseña-falsa-para-igualar-tiempos');

  constructor(
    @Inject(PG) private pg: Pool,
    @Inject(REDIS) private redis: Redis,
  ) {}

  async login(email: string, password: string, ip: string) {
    const key = `login:fallos:${email}:${ip}`;
    if (Number((await this.redis.get(key)) ?? 0) >= MAX_FALLOS) {
      throw new HttpException('Demasiados intentos. Prueba en 15 minutos.', 429);
    }

    const { rows } = await this.pg.query(
      'SELECT id, email, password_hash FROM app.usuarios WHERE email = $1',
      [email],
    );
    const user = rows[0];

    let ok = false;
    if (user) ok = await verifyPassword(password, user.password_hash);
    else await verifyPassword(password, await this.dummyHash); // iguala tiempos

    if (!ok) {
      const n = await this.redis.incr(key);
      if (n === 1) await this.redis.expire(key, BLOQUEO_SEG);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.redis.del(key);
    const token = randomBytes(32).toString('base64url');
    const sesion: SesionUsuario = { uid: user.id, email: user.email };
    await this.redis.set(`sess:${token}`, JSON.stringify(sesion), 'EX', SESSION_TTL);
    return { token, email: user.email as string };
  }

  async getSession(token: string): Promise<SesionUsuario | null> {
    const raw = await this.redis.get(`sess:${token}`);
    return raw ? (JSON.parse(raw) as SesionUsuario) : null;
  }

  async logout(token: string | null) {
    if (token) await this.redis.del(`sess:${token}`);
  }
}
