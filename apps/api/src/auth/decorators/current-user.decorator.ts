import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator tiện ích để trích xuất thông tin người dùng hiện tại từ Request object
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

