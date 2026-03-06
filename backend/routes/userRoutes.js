// backend/routes/userRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// GET /api/user/profile
router.get("/profile", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (err) {
        console.error("Get profile error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/user/profile
router.put("/profile", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { name, currentPassword, newPassword, avatar } = req.body;

        if (name) user.name = name;
        if (avatar !== undefined) user.avatar = avatar;

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required to change password" });
            }
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid current password" });
            }
            user.password = newPassword; // pre-save hook will hash it
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar,
            lastLogin: updatedUser.lastLogin
        });
    } catch (err) {
        console.error("Update profile error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/user/streak
router.get("/streak", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("currentStreak longestStreak lastEntryDate");
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if streak was lost today (last entry was > 1 day ago)
        if (user.lastEntryDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const last = new Date(user.lastEntryDate);
            last.setHours(0, 0, 0, 0);
            const diffTime = Math.abs(today - last);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (today > last && diffDays > 1) {
                user.currentStreak = 0;
                await user.save();
            }
        }

        res.json({
            currentStreak: user.currentStreak || 0,
            longestStreak: user.longestStreak || 0
        });
    } catch (err) {
        console.error("Get streak error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
