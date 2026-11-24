const nodemailer = require('nodemailer');
const crypto = require('crypto');

function createTransporter() {
  // Prefer explicit SMTP; fall back to ethereal-style logging in development
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Dev fallback: log emails instead of sending
  return {
    sendMail: async (opts) => {
      console.log('\n========== EMAIL (dev mode) ==========');
      console.log('To:', opts.to);
      console.log('Subject:', opts.subject);
      console.log('Text:', opts.text);
      if (opts.html) console.log('HTML length:', opts.html.length);
      console.log('======================================\n');
      return { messageId: 'dev-' + Date.now() };
    },
  };
}

const transporter = createTransporter();

const FROM = process.env.EMAIL_FROM || 'CloudGallery <noreply@cloudgallery.app>';
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendVerificationEmail(email, token, name) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your CloudGallery email',
    text: `Hi ${name},\n\nPlease verify your email by opening this link:\n${link}\n\nThis link expires in 24 hours.\n\n— CloudGallery`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Verify your email</h2>
        <p>Hi ${name},</p>
        <p>Thanks for signing up for CloudGallery. Click the button below to verify your email address.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Verify Email
          </a>
        </p>
        <p style="color:#666;font-size:14px">Or copy this link:<br>${link}</p>
        <p style="color:#666;font-size:14px">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, token, name) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your CloudGallery password',
    text: `Hi ${name},\n\nReset your password here:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\n— CloudGallery`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Reset Password
          </a>
        </p>
        <p style="color:#666;font-size:14px">Or copy this link:<br>${link}</p>
        <p style="color:#666;font-size:14px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
