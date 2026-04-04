import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithCookies } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithCookies>();
    return request.user;
  },
);
