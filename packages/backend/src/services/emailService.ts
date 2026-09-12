import nodemailer, { Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Test Analytics <no-reply@test-analytics.in>';
const CONTACT_FORM_RECIPIENT = process.env.CONTACT_FORM_EMAIL || 'vijayravindran1990@gmail.com';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ContactFormSubmission {
  fromEmail: string;
  subject: string;
  description: string;
  attachment?: { filename: string; content: Buffer; contentType?: string };
}

export async function sendContactFormEmail(submission: ContactFormSubmission): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[email] SMTP not configured — contact form submission from ${submission.fromEmail}: ${submission.subject}`);
    return;
  }

  await getTransporter().sendMail({
    from: EMAIL_FROM,
    to: CONTACT_FORM_RECIPIENT,
    replyTo: submission.fromEmail,
    subject: `[Contact form] ${submission.subject}`,
    html: `
      <p><strong>From:</strong> ${escapeHtml(submission.fromEmail)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(submission.subject)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(submission.description).replace(/\n/g, '<br>')}</p>
      ${submission.attachment ? '<p><em>Attachment included below.</em></p>' : ''}
    `,
    attachments: submission.attachment
      ? [
          {
            filename: submission.attachment.filename,
            content: submission.attachment.content,
            contentType: submission.attachment.contentType,
          },
        ]
      : undefined,
  });
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
