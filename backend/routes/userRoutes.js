// backend/routes/userRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Entry = require("../models/Entry");

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

// GET /api/user/insights
router.get("/insights", protect, async (req, res) => {
    try {
        const now = new Date();
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);

        // Weekly Insights Logic
        const weeklyEntries = await Entry.find({
            user: req.user._id,
            date: { $gte: startOfWeek }
        });

        let totalWeeklyMinutes = 0;
        const categoryCounts = {};
        const moodScores = { "Happy": 3, "Neutral": 2, "Sad": 1, "Stressed": 0 };
        const scoreMoods = ["Stressed", "Sad", "Neutral", "Happy"];
        let totalMoodScore = 0;
        let moodCount = 0;
        const dayDurations = {};

        weeklyEntries.forEach(e => {
            totalWeeklyMinutes += e.durationMinutes;

            categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;

            if (moodScores[e.mood] !== undefined) {
                totalMoodScore += moodScores[e.mood];
                moodCount++;
            }

            const dayString = new Date(e.date).toLocaleDateString();
            dayDurations[dayString] = (dayDurations[dayString] || 0) + e.durationMinutes;
        });

        // Most frequent category
        let mostFrequentCategory = "None";
        let maxCount = 0;
        for (let cat in categoryCounts) {
            if (categoryCounts[cat] > maxCount) {
                maxCount = categoryCounts[cat];
                mostFrequentCategory = cat;
            }
        }

        // Average mood
        let averageMood = "Neutral";
        if (moodCount > 0) {
            const avgScore = Math.round(totalMoodScore / moodCount);
            averageMood = scoreMoods[avgScore] || "Neutral";
        }

        // Most productive day
        let mostProductiveDay = "None";
        let maxDuration = 0;
        for (let day in dayDurations) {
            if (dayDurations[day] > maxDuration) {
                maxDuration = dayDurations[day];
                mostProductiveDay = day;
            }
        }

        // Suggestion
        let suggestion = "Log more activities to get personalized insights!";
        if (totalWeeklyMinutes > 0) {
            if (averageMood === "Stressed" || averageMood === "Sad") {
                suggestion = "Take it easy! Your mood has been low. Try adding more 'Entertainment' or 'Personal' time to your routine.";
            } else if (mostFrequentCategory === "Work" || mostFrequentCategory === "Study") {
                suggestion = "You've been very productive with work/study! Don't forget to take breaks.";
            } else if (mostFrequentCategory === "Exercise") {
                suggestion = "Great job staying active! Maintaining this will boost your overall mood.";
            } else {
                suggestion = "You have a nicely balanced week. Keep up the good work!";
            }
        }

        // Category Streaks Logic
        const allEntries = await Entry.find({ user: req.user._id }).sort({ date: -1 });
        const streaks = { Study: 0, Exercise: 0, Work: 0, Social: 0 };
        const lastEntryDates = {};

        allEntries.forEach(e => {
            const eDate = new Date(e.date);
            eDate.setHours(0, 0, 0, 0);

            if (streaks[e.category] !== undefined) {
                if (!lastEntryDates[e.category]) {
                    // First entry for this category (most recent)
                    const diffDays = Math.ceil(Math.abs(now.setHours(0, 0, 0, 0) - eDate) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 1) { // Same day or yesterday
                        streaks[e.category] = 1;
                        lastEntryDates[e.category] = eDate;
                    } else {
                        // Lost streak, mark it as handled so we don't process older ones
                        lastEntryDates[e.category] = new Date(0);
                    }
                } else if (lastEntryDates[e.category] > new Date(1000)) { // Active streak
                    const lastDate = lastEntryDates[e.category];
                    const diffDays = Math.ceil(Math.abs(lastDate - eDate) / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) { // Consecutive day
                        streaks[e.category]++;
                        lastEntryDates[e.category] = eDate;
                    } else if (diffDays > 1) {
                        // Streak broken
                        lastEntryDates[e.category] = new Date(0);
                    }
                }
            }
        });

        res.json({
            weekly: {
                totalMinutes: totalWeeklyMinutes,
                mostFrequentCategory,
                averageMood,
                mostProductiveDay,
                suggestion
            },
            streaks
        });

    } catch (err) {
        console.error("Get insights error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
