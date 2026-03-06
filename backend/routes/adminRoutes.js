// backend/routes/adminRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");
const User = require("../models/User");
const Entry = require("../models/Entry");
const AdminLog = require("../models/AdminLog");
const mongoose = require("mongoose");

const router = express.Router();

// GET /api/admin/users
router.get("/users", protect, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });

        // Attach entry counts for each user
        const usersWithStats = await Promise.all(
            users.map(async (u) => {
                const count = await Entry.countDocuments({ user: u._id });
                return { ...u.toObject(), entryCount: count };
            })
        );

        res.json(usersWithStats);
    } catch (err) {
        console.error("Admin gets users error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", protect, verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Delete all entries by this user
        await Entry.deleteMany({ user: user._id });

        // Delete the user
        await user.deleteOne();

        await AdminLog.create({
            adminId: req.user._id,
            targetUserId: user._id, // This will be sort of a dangling ref, but kept for string value
            action: "DELETE_USER",
            details: `Deleted user ${user.email}`
        });

        res.json({ message: "User removed successfully" });
    } catch (err) {
        console.error("Admin delete user error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/admin/users/:id/toggle-status
router.put("/users/:id/toggle-status", protect, verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isActive = !user.isActive;
        await user.save();

        await AdminLog.create({
            adminId: req.user._id,
            targetUserId: user._id,
            action: user.isActive ? "ENABLE_USER" : "DISABLE_USER",
            details: `${user.isActive ? 'Enabled' : 'Disabled'} user ${user.email}`
        });

        res.json({ message: `User ${user.isActive ? 'enabled' : 'disabled'} successfully`, isActive: user.isActive });
    } catch (err) {
        console.error("Admin toggle status error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/users/:id/entries
router.get("/users/:id/entries", protect, verifyAdmin, async (req, res) => {
    try {
        const entries = await Entry.find({ user: req.params.id }).sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        console.error("Admin get user entries error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/stats
router.get("/stats", protect, verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const totalLogs = await Entry.countDocuments({});

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const logsToday = await Entry.countDocuments({ createdAt: { $gte: startOfDay } });

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        const logsThisWeek = await Entry.countDocuments({ createdAt: { $gte: startOfWeek } });

        const moods = await Entry.aggregate([
            { $group: { _id: "$mood", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        const activities = await Entry.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        res.json({
            totalUsers,
            totalLogs,
            logsToday,
            logsThisWeek,
            mostCommonMood: moods.length > 0 ? moods[0]._id : "N/A",
            mostCommonActivity: activities.length > 0 ? activities[0]._id : "N/A"
        });
    } catch (err) {
        console.error("Admin stats error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/logs
router.get("/logs", protect, verifyAdmin, async (req, res) => {
    try {
        const logs = await AdminLog.find({})
            .populate("adminId", "name email")
            .populate("targetUserId", "name email")
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(logs);
    } catch (err) {
        console.error("Admin logs error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/health
router.get("/health", protect, verifyAdmin, async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

        let aiStatus = "Unknown";
        try {
            const mlRes = await fetch("http://localhost:5001/health", { method: "GET" }).catch(() => null);
            aiStatus = mlRes && mlRes.ok ? "Connected" : "Disconnected";
        } catch (e) {
            aiStatus = "Disconnected";
        }

        res.json({
            backendStatus: "Online",
            databaseStatus: dbStatus,
            aiServiceStatus: aiStatus
        });
    } catch (err) {
        console.error("Health check error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/export/users
// In practical apps we'd return CSV, we can return JSON and let frontend convert or generate string here. Returning string here.
router.get("/export/users", protect, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}).lean();
        let csv = "ID,Name,Email,Role,IsActive,CreatedAt,LastLogin\n";
        users.forEach(u => {
            csv += `${u._id},"${u.name}","${u.email}",${u.role},${u.isActive},${u.createdAt},${u.lastLogin}\n`;
        });
        res.header("Content-Type", "text/csv");
        res.attachment("users_export.csv");
        return res.send(csv);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/export/logs
router.get("/export/logs", protect, verifyAdmin, async (req, res) => {
    try {
        const entries = await Entry.find({}).populate("user", "email").lean();
        let csv = "ID,UserEmail,Date,ActivityTitle,Category,DurationMinutes,Mood,PredictedMood\n";
        entries.forEach(e => {
            const email = e.user ? e.user.email : "DeletedUser";
            csv += `${e._id},"${email}",${e.date},"${e.activityTitle}","${e.category}",${e.durationMinutes},"${e.mood}","${e.predictedMood || ''}"\n`;
        });
        res.header("Content-Type", "text/csv");
        res.attachment("logs_export.csv");
        return res.send(csv);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
