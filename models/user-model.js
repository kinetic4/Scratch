const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      refs: "product",
    },
  ],
  contactNo: Number,
  orders: {
    type: Array,
    default: [],
  },
  pictures: String,
});

module.exports = mongoose.model("users", userSchema);
