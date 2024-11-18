const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');

// Generate a new secret for OTP
const secret = speakeasy.generateSecret().base32;

const generateOTP = () => {
  if (!secret) {
    secret = speakeasy.generateSecret().base32
  }
  return speakeasy.totp({
    secret: secret, // Use the generated secret
    encoding: 'base32', // Specify encoding
    digits: 6
  });
};

const sendOTP = async (email, otp) => {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
    });
  
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // user's email
      subject: 'Your OTP for authentication',
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
    };
  
    await transporter.sendMail(mailOptions);
  };

module.exports = { generateOTP, sendOTP };
