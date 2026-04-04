import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from 'src/common/decorators/roles.decorator';
import { RequestWithCookies } from '../interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    const hasRole = requiredRoles.some(
      (role) => user.role === (role as string),
    );
    if (!hasRole) {
      this.logger.warn(
        `User with id ${user.id} attempted to access a forbidden resource requiring roles: ${requiredRoles.join(', ')}.`,
      );
      throw new ForbiddenException('Forbidden resource');
    }
    this.logger.log(
      `User with id ${user.id} accessed a resource requiring roles: ${requiredRoles.join(', ')}.`,
    );
    return true;
  }
}
