import { env, mailerEnabled } from '../config/env.js';

/**
 * Send an email. With no SMTP transport configured (the default), this is a
 * mock: the message and any action link are logged to the server console and
 * the link is returned so dev/test flows can complete without a real inbox.
 * A real transport (e.g. nodemailer) drops in here later with no call-site
 * changes.
 *
 * @param {{ to: string, subject: string, text: string, link?: string }} msg
 * @returns {Promise<{ mocked: boolean, link?: string }>}
 */
export async function sendMail({ to, subject, text, link }) {
  if (!mailerEnabled) {
    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        '────────────────────────────────────────',
        `[mock-mailer] To: ${to}`,
        `[mock-mailer] From: ${env.mail.from}`,
        `[mock-mailer] Subject: ${subject}`,
        `[mock-mailer] ${text}`,
        link ? `[mock-mailer] Link: ${link}` : '',
        '────────────────────────────────────────',
      ]
        .filter(Boolean)
        .join('\n')
    );
    return { mocked: true, link };
  }

  // A real SMTP transport would be wired here. Until then, treat "enabled" as a
  // config error rather than silently dropping mail.
  throw new Error('SMTP transport configured but not implemented.');
}

// In non-production, surface the action link to the API caller so the flow is
// testable end-to-end without an inbox. Never leak it in production.
export function devLink(link) {
  return env.isProduction ? undefined : link;
}
