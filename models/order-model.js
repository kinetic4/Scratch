const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: String,
  amount: Number,
  products: Array,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('order', orderSchema);