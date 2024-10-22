const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const isLoggedIn = require("../middleware/isLoggedIn");
const { registerOwner, loginOwner, logoutOwner, verifyOwnerOTP } = require('../controller/authController');

router.post("/create", registerOwner);


router.get("/admin", isLoggedIn,  async function (req, res) {
    try {
        if(!req.owner || !req.owner._id) {
            return res.status(403).redirect('/owners/login')
        }

        const owner = await ownerModel.findById(req.owner._id);
        if (!owner) {
          return res.status(403).redirect('/owners/login');
        }
    
        let success = req.flash("success") || [];
        let error = req.flash("error") || [];
    
        res.render("createproducts", { success, error, loggedIn: true, isOwner: true });
      } catch (err) {
        console.error("Error checking owner status:", err);
        res.status(500).send("Something went wrong!");
      }
  });

    // New owner login route (GET)
    router.get("/login", function (req, res) {;
        let error = req.flash("error");
        res.render("login", { loggedIn: false, error, isOwnerAuth: true });
      });

      router.post('/login', loginOwner);



router.post('/verify-otp', verifyOwnerOTP)
      // New owner signup route (GET)
      router.get("/signup",  function (req, res) {
        let error = req.flash("error");
        res.render("signup", { loggedIn:false, error, isOwnerAuth: true});
      });

      router.get("/logout", logoutOwner);


module.exports = router;
