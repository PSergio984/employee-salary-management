export interface User {
  id: number;
  username: string;
}

export interface AuthSession {
  user: User;
  expiresAt: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
