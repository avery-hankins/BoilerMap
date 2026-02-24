import nodemailer from "nodemailer";

export const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    // secure: false uses STARTTLS — the connection upgrades to TLS after,
		// which is still secure.
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};
