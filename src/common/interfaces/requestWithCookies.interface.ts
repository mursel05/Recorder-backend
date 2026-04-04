export interface RequestWithCookies extends Request {
  cookies: {
    access_token: string;
    refresh_token: string;
  };
  user: {
    id: number;
    role: string;
  };
}
