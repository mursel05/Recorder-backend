import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { TokenService } from 'src/modules/auth/token.service';
import { RequestWithCookies } from '../interfaces';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private tokenService: TokenService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const { access_token } = request.cookies;
    if (!access_token) {
      if (isPublic) {
        return true;
      } else {
        this.logger.warn(
          `Unauthorized access attempt to ${request.url} without access token.`,
        );
        throw new UnauthorizedException('Session has expired.');
      }
    } else {
      const payload = this.tokenService.validateAccessToken(access_token);
      if (!payload) {
        throw new UnauthorizedException('Session has expired.');
      }
      request.user = {
        id: payload.sub,
        role: payload.role,
      };
      return true;
    }
  }
}
