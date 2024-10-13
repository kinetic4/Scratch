const express = require('express')
const isLoggedIn = require('../middleware/isLoggedIn')
const router = express.Router()
const productModel = require('../models/product-model')
const userModel = require('../models/user-model')

router.get('/', async function  (req, res) {
    let error = req.flash('error');
    const loggedIn = !!req.user;
    let shopProduct = await productModel.find().lean();
    let selectiveProducts = shopProduct.filter(product => product.price > 1000);
    let newarivalproducts = shopProduct.filter(product => product.price < 1000)
    res.render('index', { error, loggedIn, shopProduct: selectiveProducts, newarivalproducts: newarivalproducts });
})

router.get('/login', async function(req, res) {
    const loggedIn = !!req.user; 
    let error = req.flash('error');
    res.render('login', {loggedIn, error})
})

router.get('/signup', async function(req, res) {
    const loggedIn = !!req.user; 
    let error = req.flash('error');
    res.render('signup', {loggedIn, error})
})

router.get("/shop", isLoggedIn, async function (req, res) {
   let shopProduct =  await productModel.find()
   const error = req.flash('error') || []; // Example: using flash for error messages
   let success = req.flash('success') || []
    res.render("shop", { shopProduct, success, loggedIn: true, error });
});

router.get("/cart", isLoggedIn, async function (req, res) {
    try {
      const { action, productId } = req.query;
      let cartuser = await userModel.findOne({ email: req.user.email });
  
      if (!cartuser) {
        throw new Error('User not found');
      }
  
  
      if (action && productId) {
        // Ensure cart is an array and contains no null values
        cartuser.cart = Array.isArray(cartuser.cart) ? cartuser.cart.filter(item => item != null) : [];
  
        const productIndex = cartuser.cart.findIndex(item => item && item.toString() === productId);
        
  
        if (productIndex !== -1) {
          if (action === 'increase') {
            cartuser.cart.push(cartuser.cart[productIndex]);
          } else if (action === 'decrease' && cartuser.cart.length > 1) {
            cartuser.cart.splice(productIndex, 1);
          }
          
          try {
            await cartuser.save();
            console.log('Cart saved successfully');
          } catch (saveError) {
            console.error('Error saving cart:', saveError);
            throw new Error('Failed to update cart');
          }
        }
      }
  
      cartuser = await userModel
        .findOne({ email: req.user.email })
        .populate({ path: 'cart', model: 'products' })
        .lean();
  
      if (!cartuser) {
        throw new Error('User not found after cart update');
      }
  
  
      // Filter out null values
      let validProducts = cartuser.cart.filter(product => product != null);
  
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
  
  
      res.render("cart", { cartuser, validProducts, loggedIn: true, error: req.flash('error') });
    } catch (error) {
      console.error('Error in cart route:', error);
      res.status(500).render("cart", { error: [error.message] });
    }
  });


router.get("/removefromcart/:productid", isLoggedIn, async function (req, res) {
    try {
        const productId = req.params.productid;

        // Find the user and remove the product from their cart
        const user = await userModel.findOneAndUpdate(
            { email: req.user.email },
            { $pull: { cart: productId } }, // Use $pull to remove the item
            { new: true }
        );

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/cart');
        }

        res.redirect('/cart');
    } catch (error) {
        req.flash('error', 'An error occurred while removing from cart');
        res.redirect('/cart');
    }
});

router.get("/addtocart/:productid", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email })
    user.cart.push(req.params.productid);
    await user.save()
    req.flash('success', 'Added to cart');
    res.redirect('/shop');
});



router.get('logout', isLoggedIn, function (req, res) {
    res.render('shop')
})
module.exports = router