import nodemailer, { Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Test Analytics <no-reply@test-analytics.in>';

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[email] SMTP not configured — verification link for ${to}: ${verifyUrl}`);
    return;
  }

  await getTransporter().sendMail({
    from: EMAIL_FROM,
    to,
    subject: 'Verify your email for Test Analytics',
    html: `
      <p>Welcome to Test Analytics! Please confirm your email address to activate your account.</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>Or paste this link into your browser: ${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}
