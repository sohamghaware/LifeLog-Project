// backend/routes/aiRoutes.js
const express = require("express");
const Entry = require("../models/Entry");
const { protect } = require("../middleware/authMiddleware");
const {
  computeCategoryMoodScores,
  generateSuggestions,
} = require("../utils/moodAnalysis");

const router = express.Router();

// GET /api/ai/mood-support?currentMood=Sad
router.get("/mood-support", protect, async (req, res) => {
  try {
    let currentMood = req.query.currentMood;
    if (!currentMood) {
      const latestEntry = await Entry.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      currentMood = latestEntry ? latestEntry.mood : "Neutral";
    }
    if (currentMood !== "Sad" && currentMood !== "Stressed") {
      return res.json({
        mood: currentMood,
        suggestions: [
          "You're doing great! Keep up the good work. ✨",
        ],
      });
    }

    // Look at recent entries (e.g., last 30 days)
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    const entries = await Entry.find({
      user: req.user._id,
      date: { $gte: sinceDate },
    });

    const categoryScores = computeCategoryMoodScores(entries);
    const suggestions = generateSuggestions(categoryScores);

    res.json({
      mood: currentMood,
      categoryScores,
      suggestions,
    });
  } catch (err) {
    console.error("AI mood-support error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
