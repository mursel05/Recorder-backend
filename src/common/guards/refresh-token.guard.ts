import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from 'src/modules/auth/token.service';
import { RequestWithCookies } from '../interfaces';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const { refresh_token } = request.cookies;
    if (!refresh_token) {
      throw new UnauthorizedException('Refresh token not found.');
    }
    const payload = this.tokenService.validateRefreshToken(refresh_token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    request.user = {
      id: payload.sub,
      role: payload.role,
    };
    return true;
  }
}
