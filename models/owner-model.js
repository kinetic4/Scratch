const mongoose = require('mongoose')

const ownerSchema = mongoose.Schema({

    fullname: {
        type: String,
        minLenght: 3,
        trim: true
    },
    email: String,
    password: String,
    otp: {
      type: String
    },
    otpExpires: {
      type: Date
    },
    contact: Number,
    address: String,
    products: {
        type: Array,
        default: []
    },
    cart: [
        {
          type: mongoose.Schema.Types.ObjectId,
          refs: "product",
        },
      ],
      orders: {
        type: Array,
        default: [],
      },
    pictures: String,
    gstin: String
})

module.exports = mongoose.model('owner', ownerSchema);