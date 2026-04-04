import { AuthService } from './auth.service';
import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import express from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import type { RequestWithCookies } from 'src/common/interfaces';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  create(
    @Body()
    body: RegisterDto,
    @Res({ passthrough: true })
    response: express.Response,
  ) {
    return this.authService.register(body, response);
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  login(
    @Body()
    body: LoginDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    return this.authService.login(body, response);
  }

  @Post('forgot-password')
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(
    @Res({ passthrough: true }) response: express.Response,
    @CurrentUser() user: User,
  ) {
    return this.authService.logout(response, user);
  }

  @Post('refresh-token')
  @UseGuards(RefreshTokenGuard)
  refreshToken(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const { refresh_token } = request.cookies;
    return this.authService.refreshTokens(refresh_token, response);
  }
}
