export type AuthMode = "login" | "register";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = Pick<RegisterPayload, "email" | "password">;

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type LoginResult = {
  user: AuthUser;
  expiresIn: number;
};
