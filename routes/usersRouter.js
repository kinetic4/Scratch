const express = require("express");
const router = express.Router();
const { registeredUser, loginUser, logout, verifyOTP,} = require('../controller/authController')

router.get("/", function (req, res) {
  res.send("users - hey it's working");
});

router.post("/register", registeredUser);

router.post('/login', loginUser)


router.post('/verify-otp', verifyOTP)

router.get('/logout', logout)

module.exports = router;
