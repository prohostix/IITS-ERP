import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

// Initialize transporter if SMTP credentials are provided, else fallback to console logging
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export const sendNotificationEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@erp.com',
        to,
        subject,
        html: htmlContent
      });
      console.log(`Email sent to ${to} with subject: ${subject}`);
    } else {
      // Fallback
      console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      console.log(`[MOCK EMAIL CONTENT] ${htmlContent}`);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};
