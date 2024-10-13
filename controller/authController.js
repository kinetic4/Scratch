const userModel = require("../models/user-model");
const bycrpt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require('../utils/generateToken')

module.exports.registeredUser = async function (req, res) {
    try {
      let { email, fullname, password } = req.body;

     let user = await userModel.findOne({email: email});
     if (user) {
      req.flash("error", "You already have an account, please login.");
      return res.redirect("/signup");
    }

      bycrpt.genSalt(10, function (err, salt) {
        bycrpt.hash(password, salt, async function (err, hash) {
          if (err) return res.send(err.message);
          else {
            let user = await userModel.create({
              email,
              fullname,
              password: hash,
            });
           let token =  generateToken(user)
           res.cookie('token', token)
           res.send('/shop')
          }
        });
      });
    } catch (err) {
      res.send(err.message);
    }
};


module.exports.loginUser = async function (req, res) {
  try {
      const { email, password } = req.body;
      let user = await userModel.findOne({ email: email });
      if (!user) {
          req.flash("error", "Email or Password incorrect");
          return res.redirect("/login");
      }
      bycrpt.compare(password, user.password, function(err, result) {
          if (result) {
              let token = generateToken(user);
              res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
              res.redirect('/shop');
          } else {
              req.flash("error", "Email or Password incorrect");
              return res.redirect('/login');
          }
      });
  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};


module.exports.logout = function (req, res) {
  res.cookie('token', '');
  res.redirect('/')
}