import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, COOKIE, SESSION_TTL, SesionUsuario } from './auth.service.js';
import { AuthGuard, readCookie } from './auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { email?: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const email = (body?.email ?? '').trim().toLowerCase();
    const password = body?.password ?? '';
    if (!email || !password) throw new BadRequestException('Email y contraseña requeridos');

    const { token, email: e } = await this.auth.login(email, password, req.ip ?? 'ip');
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL * 1000,
      path: '/',
    });
    return { email: e };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(readCookie(req.headers.cookie, COOKIE));
    res.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: SesionUsuario }) {
    return { email: req.user.email };
  }
}
