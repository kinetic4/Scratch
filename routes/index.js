const express = require("express");
const isLoggedIn = require("../middleware/isLoggedIn");
const router = express.Router();
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const ownerModel = require("../models/owner-model");
const { model } = require("mongoose");
const { verifyOTP, verifyOwnerOTP } = require('../controller/authController');
const ChatService = require("../services/chatService");

router.get("/", async function (req, res) {
  let error = req.flash("error");
  const loggedIn = !!req.user;
  let shopProduct = await productModel.find().lean();
  let selectiveProducts = shopProduct.filter((product) => product.price > 1000);
  let newarivalproducts = shopProduct.filter((product) => product.price < 1000);
  res.render("index", {
    error,
    loggedIn,
    shopProduct: selectiveProducts,
    newarivalproducts: newarivalproducts,
  });
});

router.get("/login", async function (req, res) {
  const loggedIn = !!req.user;
  let error = req.flash("error");
  res.render("login", { loggedIn, error, isOwnerAuth: false });
});

router.get("/signup", async function (req, res) {
  const loggedIn = !!req.user;
  let error = req.flash("error");
  res.render("signup", { loggedIn, error, isOwnerAuth: false });
});

// For user OTP verification
router.get("/verify-otp", function (req, res) {
  const loggedIn = false; // User isn't logged in yet during OTP verification
  let error = req.flash("error");
  res.render("verify-otp", { loggedIn, error, isOwnerAuth: false });
});

      // For owner OTP verification
      router.get("/owners/verify-otp", function (req, res) {
        const loggedIn = false; // Owner isn't logged in yet during OTP verification
        let error = req.flash("error");
        res.render("owner-otp", { loggedIn, error, isOwnerAuth: true });
      });
 

router.get("/shop", isLoggedIn, async function (req, res) {
  const error = req.flash("error") || [];
  let success = req.flash("success") || [];
  const { sortBy, availability, discounted, newCollection, priceMin, priceMax } = req.query;

  let filter = {};
  
  if (availability === 'true') {
    filter.available = true;
  }
  if (discounted === 'true') {
    filter.discount = { $gt: 0 };
  }
  if (newCollection === 'true') {
    filter.isNewCollection = true;
  }
  if (priceMin || priceMax) {
    filter.price = {};
    if (priceMin) {
      filter.price.$gte = Number(priceMin);
    }
    if (priceMax) {
      filter.price.$lte = Number(priceMax);
    }
  }

  let sortOption = {};

  if (sortBy) {
    switch (sortBy) {
      case 'popular':
        sortOption = { popularity: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'price-low-high':
        sortOption = { price: 1 };
        break;
      case 'price-high-low':
        sortOption = { price: -1 };
        break;
    }
  }

  try {
    let shopProduct = await productModel.find(filter).sort(sortOption).lean();

    shopProduct = shopProduct.map((product) => ({
      ...product,
      formattedPrice: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(product.price),
      discountedPrice: product.discount > 0 
        ? new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(product.price * (1 - product.discount / 100))
        : null
    }));

    // Determine if the current user is an owner or a regular user
    const isOwner = req.isOwner;
    const currentUser = isOwner ? req.owner : req.user;

    res.render("shop", {
      shopProduct,
      sortBy,
      availability,
      discounted,
      newCollection,
      priceMin,
      priceMax,
      error,
      success,
      loggedIn: true,
      isOwner,
      currentUser,
      // ... other variables ...
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    req.flash("error", "An error occurred while fetching products");
    res.redirect("/");
  }
});

router.get("/shop/product/:id", isLoggedIn, async function (req, res) {
  const productId = req.params.id;
  const error = req.flash("error") || [];
  let success = req.flash("success") || [];

  try {
    const product = await productModel.findById(productId).lean();

    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/shop");
    }

    // Format the price and calculate discounted price
    product.formattedPrice = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(product.price);

    product.discountedPrice = product.discount > 0 
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(product.price * (1 - product.discount / 100))
      : null;

    // Determine if the current user is an owner or a regular user
    const isOwner = req.isOwner;
    const currentUser = isOwner ? req.owner : req.user;

    res.render("product-overview", {
      product,
      error,
      success,
      loggedIn: true,
      isOwner,
      currentUser,
    });
  } catch (err) {
    console.error("Error fetching product:", err);
    req.flash("error", "An error occurred while fetching the product");
    res.redirect("/shop");
  }
});

router.get("/account", isLoggedIn, async function(req, res) {
  try {

    const model = req.isOwner ? ownerModel : userModel

    let account = await model.findById(req.isOwner ? req.owner._id : req.user._id).select('-password').lean();

    if (!account) {
      req.flash("error", "User not found");
      return res.redirect("/");
    }
    
    const loggedIn = true; // Since isLoggedIn middleware is used, user is always logged in here

    if(req.query.update === 'true') {
      const updateUser = {
        fullname: req.query.fullname || account.fullname,
        email: req.query.email || account.email,
        contact: req.query.phone || account.contact,
        address: req.query.address || account.address
      }

      account = await model.findByIdAndUpdate(req.isOwner ? req.owner._id : req.user._id, updateUser, { new: true }).lean()

      req.flash('success', 'Profile Updated successfully');
      return res.redirect('/account')
    }

    res.render('profile', {
      user: {
        name: account.fullname,  // Use account for fetching user details
        email: account.email,
        fullname: account.fullname,
        phone: account.contact,
        address: account.address,
        avatar: account.avatar || '/images/default-avatar.png', // Default avatar
      },
      isOwner: req.isOwner, // Passed from isLoggedIn middleware
      error: req.flash("error"),
      success: req.flash('success')
    });

  } catch(err) {
    console.error("Error in account route:", err);
    req.flash("error", "An error occurred while fetching your account information");
    res.redirect("/shop");
  }
});

router.get("/cart", isLoggedIn, async function (req, res) {
  try {
    // Check if it's a user or an owner
    const isOwner = req.isOwner;
    let currentUser, Model;

    if (isOwner) {
      currentUser = req.owner;
      Model = ownerModel;
    } else {
      currentUser = req.user;
      Model = userModel;
    }

    if (!currentUser) {
      req.flash('error', 'Access denied.');
      return res.redirect('/shop');
    }

    const { action, productId } = req.query;

    if (action && productId) {
      // Ensure cart is an array
      if (!Array.isArray(currentUser.cart)) {
        currentUser.cart = [];
      }

      const productIndex = currentUser.cart.findIndex(item => item && item.toString() === productId);

      if (action === 'increase') {
        if (productIndex !== -1) {
          currentUser.cart.push(currentUser.cart[productIndex]);
        } else {
          currentUser.cart.push(productId);
        }
      } else if (action === 'decrease' && productIndex !== -1) {
        currentUser.cart.splice(productIndex, 1);
      }

      try {
        await currentUser.save();
        console.log('Cart saved successfully');
      } catch (saveError) {
        console.error('Error saving cart:', saveError);
        throw new Error('Failed to update cart');
      }
    }

    // Populate cart with products
    currentUser = await Model
      .findById( currentUser._id )
      .populate({
        path: 'cart',
        model: 'products'
      })
      .lean();

    if (!currentUser) {
      throw new Error('User or Owner not found after cart update');
    }

    // Ensure cart exists and is an array
    if (!currentUser.cart || !Array.isArray(currentUser.cart)) {
      currentUser.cart = [];
    }

    // Filter out null values
    let validProducts = currentUser.cart.filter(product => product != null);

    // Create a map to hold unique products with quantities
    let productMap = {};

    // Loop through each product in the cart
    validProducts.forEach(product => {
      if (product && product._id) {
        if (productMap[product._id]) {
          // If product already exists in the map, increase its quantity
          productMap[product._id].quantity += 1;
        } else {
          // Add new product to the map with initial quantity 1
          productMap[product._id] = { ...product, quantity: 1 };
        }
      }
    });

    // Convert productMap back to an array
    validProducts = Object.values(productMap);

    // Format the price for each product
    function formatPrice(value) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(value);
    }

    const loggedIn = true;

    // Render the cart view
    res.render("cart", { 
      currentUser, 
      validProducts, 
      loggedIn, 
      formatPrice,  
      error: req.flash('error'),
      isOwner
    });
  } catch (error) {
    console.error('Error in cart route:', error);
    res.status(500).render("cart", { error: [error.message] });
  }
});

router.get("/removefromcart/:productid", isLoggedIn, async function (req, res) {
  try {
    const productId = req.params.productid;

    // Determine whether the logged-in user is an owner or a regular user
    const model = req.isOwner ? ownerModel : userModel; 
    const userId = req.isOwner ? req.owner._id : req.user._id; // Get the correct ID based on role

    // Find the user/owner and remove the product from their cart using $pull
    const user = await model.findOneAndUpdate(
      { _id: userId },    // Make sure you use `_id` instead of `id`
      { $pull: { cart: productId } }, // $pull will remove the productId from the cart array
      { new: true } // Return the updated document
    );

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/cart");
    }

    // Optionally: Send a success flash message or just redirect to cart
    req.flash("success", "Product removed from cart");
    res.redirect("/cart");

  } catch (error) {
    console.error("Error removing product from cart:", error); // Log the error for debugging
    req.flash("error", "An error occurred while removing the product from the cart");
    res.redirect("/cart");
  }
});


router.get("/addtocart/:productid", isLoggedIn, async function (req, res) {
  const model = req.isOwner ? ownerModel : userModel
  let user = await model.findOne(req.isOwner ? req.owner._id : req.user._id);

  if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/");
  }
  

  user.cart.push(req.params.productid);
  await user.save();
  req.flash("success", "Added to cart");
  res.redirect("/shop");
});

router.get("logout", isLoggedIn, function (req, res) {
  res.render("shop");
});


module.exports = router;
