import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return nanoid(32);
}

export function generateVerificationToken(): string {
  return nanoid(24);
}

export function getTokenExpiration(type: "email_confirmation" | "password_reset"): Date {
  const now = new Date();
  if (type === "email_confirmation") {
    // 48 hours for email confirmation
    return new Date(now.getTime() + 48 * 60 * 60 * 1000);
  } else {
    // 4 hours for password reset
    return new Date(now.getTime() + 4 * 60 * 60 * 1000);
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320;
}

export function isValidPassword(password: string): boolean {
  // Mínimo 8 caracteres, pelo menos 1 letra e 1 número
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

export function getPasswordErrorMessage(password: string): string | null {
  if (password.length < 8) {
    return "Senha deve ter no mínimo 8 caracteres";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Senha deve conter pelo menos uma letra";
  }
  if (!/\d/.test(password)) {
    return "Senha deve conter pelo menos um número";
  }
  return null;
}
