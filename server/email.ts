/**
 * Email helper using Resend API (https://resend.com)
 * Sends transactional emails to the personal trainer only:
 * - Welcome email on registration
 * - Password reset link
 */

const RESEND_API_URL = "https://api.resend.com/emails";
// Use Resend's sandbox domain for testing (works with any recipient when API key is valid)
const FROM_EMAIL = "FITPRO <onboarding@resend.dev>";

function getResendKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const apiKey = getResendKey();
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email send");
    return false;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Resend error:", res.status, err);
      return false;
    }

    const data = await res.json() as { id?: string };
    console.log("[Email] Sent successfully:", data.id);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    return false;
  }
}

// ==================== EMAIL TEMPLATES ====================

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Bem-vindo ao FITPRO! 💪",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #3B82F6; border-radius: 14px; font-size: 28px; line-height: 56px;">💪</div>
          <h1 style="margin: 16px 0 4px; font-size: 22px; font-weight: 700; color: #0f172a;">FITPRO</h1>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Agenda para Personal Trainers</p>
        </div>

        <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Olá, ${name}! 👋</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Sua conta no <strong>FITPRO</strong> foi criada com sucesso. Agora você pode gerenciar seus alunos, agenda, evolução e finanças em um só lugar.
        </p>

        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; font-weight: 600; color: #0369a1; font-size: 14px;">🚀 O que você pode fazer:</p>
          <ul style="margin: 0; padding-left: 20px; color: #0369a1; font-size: 14px; line-height: 2;">
            <li>Cadastrar e gerenciar alunos</li>
            <li>Organizar sua agenda de treinos</li>
            <li>Acompanhar evolução com fotos e bioimpedância</li>
            <li>Controlar cobranças e pagamentos</li>
          </ul>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} FITPRO · Todos os direitos reservados
        </p>
      </div>
    `,
    text: `Olá, ${name}! Bem-vindo ao FITPRO. Sua conta foi criada com sucesso. Acesse o app para começar.`,
  });
}

export async function sendEmailConfirmationEmail(to: string, name: string, confirmUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Confirme seu e-mail — FITPRO",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #3B82F6; border-radius: 14px; font-size: 28px; line-height: 56px;">💪</div>
          <h1 style="margin: 16px 0 4px; font-size: 22px; font-weight: 700; color: #0f172a;">FITPRO</h1>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Agenda para Personal Trainers</p>
        </div>

        <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Olá, ${name}! 👋</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Obrigado por se cadastrar no <strong>FITPRO</strong>! Para ativar sua conta, confirme seu endereço de e-mail clicando no botão abaixo.
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${confirmUrl}" style="display: inline-block; background: #3B82F6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Confirmar e-mail
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
          Este link expira em <strong>48 horas</strong>. Se você não criou uma conta, ignore este e-mail com segurança.
        </p>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} FITPRO · Todos os direitos reservados
        </p>
      </div>
    `,
    text: `Olá, ${name}! Confirme seu e-mail no FITPRO clicando no link: ${confirmUrl}\n\nEste link expira em 48 horas.`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Redefinição de senha — FITPRO",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #3B82F6; border-radius: 14px; font-size: 28px; line-height: 56px;">💪</div>
          <h1 style="margin: 16px 0 4px; font-size: 22px; font-weight: 700; color: #0f172a;">FITPRO</h1>
        </div>

        <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Redefinir senha</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Olá, <strong>${name}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta FITPRO. Clique no botão abaixo para criar uma nova senha.
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; background: #3B82F6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Redefinir minha senha
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
          Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este e-mail com segurança.
        </p>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} FITPRO · Todos os direitos reservados
        </p>
      </div>
    `,
    text: `Olá, ${name}! Acesse o link para redefinir sua senha: ${resetUrl}\n\nEste link expira em 1 hora.`,
  });
}
