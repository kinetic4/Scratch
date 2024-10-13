const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const isLoggedIn = require('../middleware/isLoggedIn');
const userModel = require('../models/user-model');
const product = require('../models/product-model')
const Order = require('../models/order-model');  // Assuming you have an Order model

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


router.post("/create-order", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findOne({ email: req.user.email })
                                .populate({
                                  path: 'cart',
                                  model: product,
                                  select: 'price discount'
                                });
    
    if (!user || !user.cart || user.cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate total amount
    const totalAmount = user.cart.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      const discount = typeof item.discount === 'number' ? item.discount : 0;

      return sum + (price - discount);
    }, 0);

    // Define platform fee as 2% of total amount (adjust as needed)
    const platformFeePercentage = 2; // 2%
    const platformFee = (totalAmount * platformFeePercentage) / 100;

    // Add platform fee to the total amount
    const finalAmount = totalAmount + platformFee;

    // Convert to paise and ensure it's an integer
    const amountInPaise = Math.round(finalAmount * 100);

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: "order_" + Date.now(),
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    // Create a new order in your database
    const newOrder = new Order({
      userId: user._id,
      orderId: order.id,
      amount: totalAmount, // Store original amount (without platform fee) in your DB
      platformFee,         // Store the platform fee separately if needed
      products: user.cart.map(item => ({
        productId: item._id,
        quantity: 1,
        price: item.price,
        discount: item.discount || 0
      })),
      status: 'PENDING'
    });

    await newOrder.save();

    res.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'An error occurred during checkout', details: error.message });
  }
});


router.post("/payment-success", isLoggedIn, async function (req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify the payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment is successful, update the order status
      await Order.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { 
          $set: { 
            status: 'PAID',
            paymentId: razorpay_payment_id
          }
        }
      );

      // Clear the user's cart
      await userModel.findByIdAndUpdate(req.user._id, { $set: { cart: [] } });

      res.json({ success: true, message: 'Payment successful' });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Payment Success Error:', error);
    res.status(500).json({ success: false, message: 'An error occurred while processing the payment' });
  }
});

module.exports = router;