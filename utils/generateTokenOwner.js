const jwt = require('jsonwebtoken');

function generateTokenOwner(owner) {
    return jwt.sign(
        { _id: owner._id, email: owner.email },
        process.env.JWT_KEY,
        { expiresIn: '1h' }
    );
}

module.exports.generateTokenOwner = generateTokenOwner;