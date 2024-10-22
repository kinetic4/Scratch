const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  fullname: String,
  email: String,
  password: String,
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  },
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      refs: "product",
    },
  ],
  contact: Number,
  orders: {
    type: Array,
    default: [],
  },
  pictures: String,
  address: String
});

module.exports = mongoose.model("users", userSchema);
