const express = require("express");
const router = express.Router();
const { registeredUser, loginUser, logout } = require('../controller/authController')

router.get("/", function (req, res) {
  res.send("users - hey it's working");
});

router.post("/register", registeredUser);

router.post('/login', loginUser)

router.get('/logout', logout)

module.exports = router;
