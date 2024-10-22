const jwt = require('jsonwebtoken');
const userModel = require('../models/user-model');
const ownerModel = require('../models/owner-model');

module.exports = async function (req, res, next) {
    const userToken = req.cookies.token;
    const ownerToken = req.cookies.ownerToken;
    
    if (!userToken && !ownerToken) {
        req.flash('error', 'You need to login first.');
        return res.redirect('/login');
    }
    
    try {
        if (userToken) {
            const decoded = jwt.verify(userToken, process.env.JWT_KEY);
            const user = await userModel.findOne({ email: decoded.email }).select('-password');
            if (!user) {
                req.flash('error', 'Authentication failed.');
                return res.redirect('/login');
            }
            req.user = user;
            req.isOwner = false;
        } else if (ownerToken) {
            const decoded = jwt.verify(ownerToken, process.env.JWT_KEY);
            const owner = await ownerModel.findOne({ email: decoded.email }).select('-password');
            if (!owner) {
                req.flash('error', 'Authentication failed.');
                return res.redirect('/owners/login');
            }
            req.owner = owner;
            req.isOwner = true;
        }
        res.locals.isOwner = req.isOwner;
        res.locals.loggedIn = true;
        next();
    } catch (err) {
        console.error('JWT Error:', err);
        req.flash('error', 'Authentication failed.');
        if (ownerToken) {
            return res.redirect('/owners/login');
        } else {
            return res.redirect('/login');
        }
    }
};