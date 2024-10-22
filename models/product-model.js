const mongoose = require('mongoose')


const productSchema = mongoose.Schema({

    image: Buffer,
    name: String,
    price: Number,
    discount: {
        type: Number,
        default: 0
    },
    bgcolor: String,
    pannelcolor: String,
    textcolor: String,
    quantity: {
        type: Number,
        default:1
    },
    isNewCollection: Boolean,
    available: Boolean,
    popularity: Number,
    ownerOnly: { type: Boolean, default: false }, // Flag for owner-specific products
    userOnly: { type: Boolean, default: false }

})

module.exports = mongoose.model('products', productSchema);