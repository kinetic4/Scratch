const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');

const generateOTP = () => {
  const secret = speakeasy.generateSecret().base32; // Generate a unique secret for each user
  const otp = speakeasy.totp({
    secret: secret,
    encoding: 'base32',
    digits: 6
  });

  return { secret, otp };
};

const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for authentication',
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { generateOTP, sendOTP };
