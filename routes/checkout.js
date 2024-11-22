// razorpay.routes.js
const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { body, validationResult } = require('express-validator');
const isLoggedIn = require("../middleware/isLoggedIn");
const userModel = require("../models/user-model");
const product = require("../models/product-model");
const Order = require("../models/order-model");
const mongoose = require('mongoose')

// Constants
const PLATFORM_FEE_PERCENTAGE = 2;
const CURRENCY = "INR";

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (error) {
  console.error("Razorpay initialization failed:", error);
  process.exit(1);
}

// Validation middleware
const validateOrder = [
  body('cart').isArray().notEmpty().withMessage('Cart cannot be empty'),
  body('cart.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('cart.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
];

// Utility functions
const calculateAmount = (cart) => {
  return cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    return sum + (price - discount) * (item.quantity || 1);
  }, 0);
};

const calculatePlatformFee = (amount) => {
  return (amount * PLATFORM_FEE_PERCENTAGE) / 100;
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const message = `${orderId}|${paymentId}`;
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(message)
    .digest("hex");
  return generated_signature === signature;
};

// Routes
router.post("/create-order", isLoggedIn, validateOrder, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await userModel
      .findOne({ email: req.user.email })
      .populate({
        path: "cart",
        model: product,
        select: "price discount stock",
      })
      .session(session);

    if (!user || !user.cart || user.cart.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Check stock availability
    for (const item of user.cart) {
      if (item.stock < 1) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: "Product out of stock", 
          productId: item._id 
        });
      }
    }

    const totalAmount = calculateAmount(user.cart);
    const platformFee = calculatePlatformFee(totalAmount);
    const finalAmount = totalAmount + platformFee;
    const amountInPaise = Math.round(finalAmount * 100);

    // Create Razorpay order with retry mechanism
    let order;
    try {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: CURRENCY,
        receipt: `order_${user._id.toString().slice(-20)}`, // Truncate to ensure under 40 chars
        payment_capture: 1,
        notes: {
          userId: user._id.toString(),
          platformFee: platformFee,
        },
      });
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      await session.abortTransaction();
      throw new Error("Payment gateway error");
    }

    // Create order in database
    const newOrder = new Order({
      userId: user._id,
      orderId: order.id,
      amount: totalAmount,
      platformFee,
      products: user.cart.map((item) => ({
        productId: item._id,
        quantity: 1,
        price: item.price,
        discount: item.discount || 0,
      })),
      status: "PENDING",
      paymentDetails: {
        gateway: "razorpay",
        currency: CURRENCY,
      },
    });

    await newOrder.save({ session });
    await session.commitTransaction();

    res.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: CURRENCY,
      keyId: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Checkout Error:", error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(500).json({
      error: "An error occurred during checkout",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
});

router.post("/payment-success", isLoggedIn, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: "Missing payment information" 
      });
    }

    // Verify payment signature
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: "Payment verification failed" 
      });
    }

    // Get order details
    const order = await Order.findOne({ orderId: razorpay_order_id }).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Update order status
    order.status = "PAID";
    order.paymentDetails.paymentId = razorpay_payment_id;
    order.paymentDetails.paidAt = new Date();
    await order.save({ session });

    // Update product stock
    for (const item of order.products) {
      await product.updateOne(
        { _id: item.productId },
        { $inc: { stock: -item.quantity } },
        { session }
      );
    }

    // Clear user's cart
    await userModel.findByIdAndUpdate(
      req.user._id,
      { $set: { cart: [] } },
      { session }
    );

    await session.commitTransaction();
    
    res.json({ 
      success: true, 
      message: "Payment successful",
      orderId: order._id 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Payment Success Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing the payment",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
});

// Webhook handler for payment events
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    const isValid = verifyWebhookSignature(req.body, signature, secret);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case "payment.failed":
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      // Add more event handlers as needed
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;