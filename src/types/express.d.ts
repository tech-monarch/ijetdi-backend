import type { Role } from "../lib/permissions.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  reviewerId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
