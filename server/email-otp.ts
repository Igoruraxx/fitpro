/**
 * OTP Email Template for FITPRO
 * Sends a 6-digit verification code to the user's email
 */

import { sendEmail } from "./email";

export async function sendOtpEmail(to: string, code: string, name?: string): Promise<boolean> {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  return sendEmail({
    to,
    subject: `${code} — Código de verificação FITPRO`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #3B82F6; border-radius: 14px; font-size: 28px; line-height: 56px;">💪</div>
          <h1 style="margin: 16px 0 4px; font-size: 22px; font-weight: 700; color: #0f172a;">FITPRO</h1>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Agenda para Personal Trainers</p>
        </div>

        <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">${greeting}</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Use o código abaixo para acessar sua conta no <strong>FITPRO</strong>:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #f0f9ff; border: 2px solid #3B82F6; border-radius: 16px; padding: 20px 40px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e40af; font-family: 'Courier New', monospace;">
              ${code}
            </span>
          </div>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-bottom: 8px;">
          Este código expira em <strong>10 minutos</strong>.
        </p>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Se você não solicitou este código, ignore este e-mail com segurança.
        </p>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          &copy; ${new Date().getFullYear()} FITPRO &middot; Todos os direitos reservados
        </p>
      </div>
    `,
    text: `${greeting} Seu código de verificação FITPRO é: ${code}. Ele expira em 10 minutos.`,
  });
}
