import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  accessTokenExpiryMs: process.env.ACCESS_TOKEN_EXPIRY_MS,
  refreshTokenExpiryMs: process.env.REFRESH_TOKEN_EXPIRY_MS,
}));
