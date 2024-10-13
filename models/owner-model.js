const mongoose = require('mongoose')

const ownerSchema = mongoose.Schema({

    fullName: {
        type: String,
        minLenght: 3,
        trim: true
    },
    email: String,
    password: String,
    contactNo: Number,
    products: {
        type: Array,
        default: []
    },
    pictures: String,
    gstin: String
})

module.exports = mongoose.model('owner', ownerSchema);