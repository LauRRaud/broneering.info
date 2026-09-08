import { randomUUID } from 'node:crypto';
import { chmod, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type AccountMail = { to: string; subject: string; text: string };
export type MailMode = 'disabled' | 'smtp' | 'capture';
const production = process.env.NODE_ENV === 'production';
const mode = (process.env.AUTH_MAIL_MODE?.trim().toLowerCase() || 'disabled') as MailMode;
const captureDir = process.env.AUTH_MAIL_CAPTURE_DIR?.trim() || path.join(process.cwd(), 'output', 'auth-mail');
let transporter: Transporter | undefined;

export function smtpTransport(): Transporter {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password) throw new Error('SMTP mail mode is not configured');
  transporter = nodemailer.createTransport({
    host, port, secure: process.env.SMTP_SECURE === 'true' || port === 465,
    requireTLS: !(process.env.SMTP_SECURE === 'true' || port === 465),
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    auth: { user, pass: password },
  });
  return transporter;
}

export function authMailMode(): MailMode { return mode; }
export function isAccountMailConfigured(): boolean {
  if (mode === 'capture') return !production;
  return mode==='smtp'&&smtpConfigured();
}
export function smtpConfigured(): boolean {
  const port=Number(process.env.SMTP_PORT || '587');
  const from=process.env.SMTP_FROM?.trim();
  return Number.isInteger(port) && port>0 && port<=65535 && Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD && from && !/[\r\n]/.test(from));
}

/** Delivery is explicit: disabled mode fails rather than pretending to send mail. */
export async function sendAccountMail(mail: AccountMail): Promise<void> {
  if (!['disabled', 'smtp', 'capture'].includes(mode)) throw new Error('AUTH_MAIL_MODE must be disabled, smtp, or capture');
  if (mode === 'disabled') throw new Error('Account email delivery is disabled');
  if (mode === 'smtp') {
    const from = process.env.SMTP_FROM?.trim();
    if (!from) throw new Error('SMTP mail mode is not configured');
    await smtpTransport().sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text });
    return;
  }
  if (production) throw new Error('AUTH_MAIL_MODE=capture is only allowed outside production');
  const relative = path.relative(process.cwd(), captureDir).split(path.sep)[0]?.toLowerCase();
  if (relative === 'public' || relative === 'src' || relative === '.next') throw new Error('Auth mail capture directory is not private');
  await mkdir(captureDir, { recursive: true, mode: 0o700 });
  await chmod(captureDir, 0o700);
  const file = path.join(captureDir, `${Date.now()}-${randomUUID()}.json`);
  const handle = await open(file, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify({ ...mail, capturedAt: new Date().toISOString() }, null, 2), 'utf8'); }
  finally { await handle.close(); }
}
