// order.model.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true,
    min: 0
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'products',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentDetails: {
    gateway: {
      type: String,
      required: true,
      enum: ['razorpay']
    },
    paymentId: String,
    currency: {
      type: String,
      required: true
    },
    paidAt: Date,
    refundId: String,
    refundedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);