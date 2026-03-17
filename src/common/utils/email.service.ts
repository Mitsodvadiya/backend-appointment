import nodemailer from 'nodemailer';
import { env } from '../../config/env';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  async sendActivationEmail(to: string, activationToken: string): Promise<void> {
    const activationLink = `http://localhost:3000/activate?token=${activationToken}`;
    
    const mailOptions = {
      from: env.smtpFrom,
      to,
      subject: 'Activate your account',
      html: `
        <h1>Welcome to Clinic Queue!</h1>
        <p>Please click the link below to activate your account:</p>
        <a href="${activationLink}">${activationLink}</a>
      `,
    };

    // Fallback to console if SMTP is not properly configured
    if (!env.smtpUser || env.smtpUser.includes('your_smtp_user')) {
      console.log(`[Development Mode] Mock Email sent to ${to}. Activation Link: ${activationLink}`);
      console.warn('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env to send real emails.');
      return;
    }

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Activation email sent to ${to}`);
    } catch (error) {
      console.error('Error sending activation email:', error);
      throw new Error('Failed to send activation email');
    }
  }
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: env.smtpFrom,
      to,
      subject: 'Reset your password',
      html: `
        <h1>Clinic Queue - Password Reset</h1>
        <p>You recently requested to reset your password. Please click the link below to set a new password:</p>
        <p><strong>Note:</strong> This link will expire in 15 minutes.</p>
        <br/>
        <a href="${resetLink}">${resetLink}</a>
        <br/>
        <br/>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      `,
    };

    if (!env.smtpUser || env.smtpUser.includes('your_smtp_user')) {
      console.log(`[Development Mode] Mock Reset Email sent to ${to}. Reset Link: ${resetLink}`);
      return;
    }

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${to}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

export const emailService = new EmailService();
