import { Resend } from 'resend';
import { randomInt } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key');

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: 'Orphan Bars <noreply@orphanbars.space>',
      to: email,
      subject: 'Verify your Orphan Bars account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7c3aed; text-align: center;">Orphan Bars</h1>
          <h2 style="text-align: center;">Verify Your Email</h2>
          <p style="text-align: center; font-size: 16px; color: #666;">
            Enter this code to complete your signup:
          </p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${code}</span>
          </div>
          <p style="text-align: center; font-size: 14px; color: #999;">
            This code expires in 10 minutes.
          </p>
          <p style="text-align: center; font-size: 14px; color: #999;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return randomInt(100000, 999999).toString();
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: 'Orphan Bars <noreply@orphanbars.space>',
      to: email,
      subject: 'Reset your Orphan Bars password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7c3aed; text-align: center;">Orphan Bars</h1>
          <h2 style="text-align: center;">Reset Your Password</h2>
          <p style="text-align: center; font-size: 16px; color: #666;">
            Enter this code to reset your password:
          </p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${code}</span>
          </div>
          <p style="text-align: center; font-size: 14px; color: #999;">
            This code expires in 10 minutes.
          </p>
          <p style="text-align: center; font-size: 14px; color: #999;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}
