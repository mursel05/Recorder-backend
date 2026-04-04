import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  apiPrefix: process.env.API_PREFIX,
  clientUrl: process.env.CLIENT_URL,
  baseUrl: process.env.BASE_URL,
  telegramToken: process.env.TELEGRAM_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  cookieDomain: process.env.COOKIE_DOMAIN,
  cookiePath: process.env.COOKIE_PATH,
}));
