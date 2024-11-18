const userModel = require("../models/user-model");
const ownerModel = require("../models/owner-model");
const bcrypt = require("bcrypt");
const { generateToken } = require('../utils/generateToken');
const { generateTokenOwner } = require('../utils/generateTokenOwner');
const { generateOTP, sendOTP } = require('../utils/otp');

module.exports.registeredUser = async function (req, res) {
  try {
    console.log("Registering user with email:", req.body.email);

    let { email, fullname, password } = req.body;
    let user = await userModel.findOne({ email });

    if (user) {
      req.flash("error", "You already have an account, please login.");
      return res.redirect("/signup");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log("Password hashed");

    user = await userModel.create({
      email,
      fullname,
      password: hash,
    });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    console.log("OTP generated and saved for user:", otp);

    await sendOTP(email, otp);
    console.log("OTP sent to:", email);

    // Store email in session for OTP verification
    req.session.verificationEmail = email;

    res.redirect('/verify-otp');
  } catch (err) {
    console.error("Error in registration:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports.sendOTPController = async function (req, res) {
    try {
      const { email } = req.body;
      const user = await userModel.findOne({ email });
  
      if (!user) {
        req.flash('error', 'Email not registered');
        return res.redirect('/register');
      }
  
      // Generate OTP and secret
      const { secret, otp } = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Set OTP expiration (10 mins)
  
      // Save to user model
      user.otp = otp;
      user.secret = secret; // Save the secret for validation
      user.otpExpires = otpExpires;
      await user.save();
  
      // Send OTP
      await sendOTP(email, otp);
  
      // Save email in session
      req.session.verificationEmail = email;
  
      res.redirect('/verify-otp');
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  module.exports.verifyOTP = async function (req, res) {
    try {
      const email = req.session.verificationEmail;
      const { otp } = req.body;
      const user = await userModel.findOne({ email });
  
      if (!user) {
        req.flash('error', 'Invalid session or user not found');
        return res.redirect('/verify-otp');
      }
  
      // Verify OTP using the saved secret
      const isValid = speakeasy.totp.verify({
        secret: user.secret,
        encoding: 'base32',
        token: otp,
        window: 1 // Allow +/- 1 time step for clock drift
      });
  
      // Check if the OTP has expired
      if (!isValid || user.otpExpires < new Date()) {
        req.flash('error', 'Invalid or expired OTP');
        return res.redirect('/verify-otp');
      }
  
      // Clear OTP and secret after successful verification
      user.otp = undefined;
      user.secret = undefined;
      user.otpExpires = undefined;
      await user.save();
  
      // Clear session
      delete req.session.verificationEmail;
  
      // Generate token
      const token = generateToken(user);
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.redirect('/shop');
    } catch (error) {
      console.error('Error verifying user OTP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

module.exports.loginUser = async (req, res) => {
  try {
      const { email, password } = req.body;

      // Find the user by email
      const user = await userModel.findOne({ email });
      if (!user) {
          req.flash('error', 'Invalid credentials');
          return res.redirect('/login'); // Redirect back to login if user not found
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          req.flash('error', 'Invalid credentials');
          return res.redirect('/login'); // Redirect back to login if passwords do not match
      }

      // If login is successful, generate a token
      let token = generateToken(user);

      // Store token in a cookie
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.redirect('/shop'); // Redirect to some protected route (adjust as needed)
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).send('Internal Server Error');
  }
};


module.exports.logout = function (req, res) {
    res.cookie('token', '');
    res.redirect('/');
};

module.exports.registerOwner = async function (req, res) {
  try {
      let { email, fullname, password } = req.body;

      let existingOwner = await ownerModel.findOne({email: email});
      if (existingOwner) {
          req.flash("error", "An owner account with this email already exists.");
          return res.redirect("/shop");
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      let newOwner = await ownerModel.create({
          email,
          fullname,
          password: hash,
      });

      const otp = generateOTP();
      newOwner.otp = otp;
      newOwner.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
      await newOwner.save();

      await sendOTP(email, otp);

      // Store email in session for OTP verification
      req.session.ownerVerificationEmail = email;

      res.redirect('/owners/verify-otp');
  } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports.verifyOwnerOTP = async function (req, res) {
try {
    const email = req.session.ownerVerificationEmail; // Get email from session
    const { otp } = req.body;
    const owner = await ownerModel.findOne({ email });

    // Log the values for debugging
    console.log('Email:', email, 'OTP Provided:', otp, 'Stored OTP:', owner ? owner.otp : 'None', 'Expires:', owner ? owner.otpExpires : 'None');

    if (!owner || owner.otp !== otp || owner.otpExpires < new Date()) {
        req.flash("error", "Invalid or expired OTP");
        return res.redirect('/owners/verify-otp');
    }

    // Clear OTP fields after successful verification
    owner.otp = undefined;
    owner.otpExpires = undefined;
    await owner.save();

    // Clear email from session
    delete req.session.ownerVerificationEmail;

    // Generate and send the token
    let token = generateTokenOwner(owner);
    res.cookie('ownerToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.redirect('/owners/admin');
} catch (error) {
    console.error('Error verifying owner OTP:', error);
    res.status(500).json({ message: 'Internal server error' });
}
};

module.exports.loginOwner = async function (req, res) {
try {
    const { email, password } = req.body;
    
    let owner = await ownerModel.findOne({ email: email });
    if (!owner) {
        req.flash("error", "Email or Password incorrect");
        return res.redirect("/owners/login");
    }
    
    const isMatch = await bcrypt.compare(password, owner.password);
    
    if (isMatch) {
        const otp = generateOTP();
        owner.otp = otp;
        owner.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
        await owner.save();

        await sendOTP(email, otp);

        // Store email in session for OTP verification
        req.session.ownerVerificationEmail = email;

        return res.redirect('/owners/verify-otp');
    } else {
        req.flash("error", "Email or Password incorrect");
        return res.redirect('/owners/login');
    }
} catch (error) {
    req.flash("error", "An error occurred during login");
    return res.redirect('/owners/login');
}
};


module.exports.logoutOwner = function (req, res) {
    res.clearCookie('ownerToken');
    res.redirect('/');
};