// backend/middleware/adminMiddleware.js
const { protect } = require("./authMiddleware");

const verifyAdmin = async (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Not authorized as an admin" });
    }
};

module.exports = { verifyAdmin };
