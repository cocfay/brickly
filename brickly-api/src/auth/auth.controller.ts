import { Controller, Post, Body, Get, UseGuards, Req, Res} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Role } from './roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
type AppType = 'panel' | 'web' | 'mobile';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private configService: ConfigService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }
  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body, Role.CLIENTE);
  }
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin','agencia','desarrolladora')
  @Post('create-user')
  create(@Req() req, @Body() body: any) {
    const requesterRoles = req.user.roles || [];
    let roleToAssign = Role.CLIENTE;

    if (requesterRoles.includes(Role.ADMIN)) {
      roleToAssign = body.roles?.[0] || Role.CLIENTE;
    }

    if (
      requesterRoles.includes(Role.AGENCIA) ||
      requesterRoles.includes(Role.DESARROLLADORA)
    ) {
      roleToAssign = Role.AGENTE;
      body.parentId = new Types.ObjectId(req.user.userId);
    }

	 return this.authService.register(body, roleToAssign);
  }
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // redirige a Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req,
    @Res() res: import('express').Response,
  ) {

    const { app } = req.user;

    const data = await this.authService.validateGoogleUser(req.user);

    const redirectBase = this.getRedirect(app);

    return res.redirect(
      `${redirectBase}?token=${data.access_token}`,
    );
  }

  private getRedirect(app?: string) {
    const redirects = {
      panel: this.configService.get<string>('LOGIN_GOOGLE_REDIR_PANEL'),
      web: this.configService.get<string>('LOGIN_GOOGLE_REDIR_WEB'),
      mobile: this.configService.get<string>('LOGIN_GOOGLE_REDIR_APP'),
    };

    if (app && app in redirects) {
      return redirects[app as AppType] || redirects.web;
    }

    return redirects.web;
  }

  @Post('forgot-password')
  forgot(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  reset(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
  }

  @Post('code/account/send')
  @UseGuards(AuthGuard('jwt'))
  verifySendCode(@Req() req) {
    return this.authService.sendCodeVerifyEmail(req.user.userId);
  }

  @Post('code/account/check')
  @UseGuards(AuthGuard('jwt'))
  verifyCheckCode(@Req() req, @Body() body: { code: string }) {
    return this.authService.checkCodeAccount(req.user.userId,body.code);
  }


}