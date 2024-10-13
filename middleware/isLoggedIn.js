const jwt = require('jsonwebtoken');
const userModel = require('../models/user-model');

module.exports = async function (req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.flash('error', 'You need to login first.');
        return res.redirect('/login');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const user = await userModel.findOne({ email: decoded.email }).select('-password');
        if (!user) {
            req.flash('error', 'Authentication failed.');
            return res.redirect('/shop');
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('JWT Error:', err);
        req.flash('error', 'Authentication failed.');
        res.redirect('/shop');
    }
};