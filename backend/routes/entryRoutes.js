// backend/routes/entryRoutes.js
const express = require("express");
const Entry = require("../models/Entry");
const Vision = require("../models/Vision");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

async function checkVisionProgress(userId, category) {
  if (!category) return;
  const visions = await Vision.find({ user: userId, type: 'activity', activityCategory: category, completed: false });
  if (!visions.length) return;

  for (let v of visions) {
    const goalStart = new Date(v.createdAt);
    goalStart.setUTCHours(0, 0, 0, 0);
    const entries = await Entry.find({ user: userId, category: v.activityCategory, date: { $gte: goalStart } });
    const totalMins = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
    v.currentHours = totalMins / 60;
    if (v.currentHours >= v.targetHours && v.targetHours > 0) {
      v.completed = true;
      v.completedAt = new Date();
    }
    await v.save();
  }
}

// POST /api/entries  – create entry
router.post("/", protect, async (req, res) => {
  try {
    const {
      date,
      activityTitle,
      category,
      durationMinutes,
      journalText,
      mood,
    } = req.body;

    const entryDate = date ? new Date(date) : new Date();

    // Streak logic
    const userDb = await require("../models/User").findById(req.user._id);

    entryDate.setHours(0, 0, 0, 0); // normalize to start of day

    if (!userDb.lastEntryDate) {
      userDb.currentStreak = 1;
      if (userDb.longestStreak < 1) userDb.longestStreak = 1;
      userDb.lastEntryDate = entryDate;
    } else {
      const lastDate = new Date(userDb.lastEntryDate);
      lastDate.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(entryDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (entryDate > lastDate) {
        if (diffDays === 1) {
          userDb.currentStreak += 1;
        } else if (diffDays > 1) {
          userDb.currentStreak = 1;
        }
        if (userDb.currentStreak > userDb.longestStreak) {
          userDb.longestStreak = userDb.currentStreak;
        }
        userDb.lastEntryDate = entryDate;
      } else if (entryDate < lastDate && diffDays > 0) {
        // Backdated entry: we won't deeply recalculate everything here
        // to keep it simple, but we won't reset their current streak
      }
    }
    await userDb.save();

    const entry = await Entry.create({
      user: req.user._id,
      date: date ? new Date(date) : new Date(),
      activityTitle,
      category,
      durationMinutes,
      journalText,
      mood,
    });

    let predictedMood = null;
    try {
      const mlRes = await fetch("http://localhost:5001/predict-mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, durationMinutes })
      });
      if (mlRes.ok) {
        const mlData = await mlRes.json();
        predictedMood = mlData.predictedMood;
      }
    } catch (e) {
      console.log("ML Service unavailable");
    }

    if (predictedMood && predictedMood !== mood) {
      entry.predictedMood = predictedMood;
      await entry.save();
    }

    const responseData = entry.toObject();

    // Trigger vision progress check synchronously to guarantee database consistency
    await checkVisionProgress(req.user._id, category).catch(err => console.error("Vision update error:", err));

    res.status(201).json(responseData);
  } catch (err) {
    console.error("Create entry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/entries – list user entries (with filters)
router.get("/", protect, async (req, res) => {
  try {
    const { date, mood, category } = req.query;
    let query = { user: req.user._id };

    if (date) {
      // Find entries within that specific local date string
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (mood) query.mood = mood;
    if (category) query.category = category;

    const entries = await Entry.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(100);

    res.json(entries);
  } catch (err) {
    console.error("Get entries error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/entries/export
router.get("/export", protect, async (req, res) => {
  try {
    const entries = await Entry.find({ user: req.user._id }).sort({ date: -1 });

    // Build CSV
    const headers = ["Date", "Activity Title", "Category", "Duration (Minutes)", "Mood", "Journal Text"];
    const rows = entries.map(e => {
      return [
        new Date(e.date).toISOString().split('T')[0],
        `"${(e.activityTitle || '').replace(/"/g, '""')}"`,
        e.category || '',
        e.durationMinutes || 0,
        e.mood || '',
        `"${(e.journalText || '').replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="lifelog_entries.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error("Export error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/entries/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const entry = await Entry.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }
    const category = entry.category;
    await entry.deleteOne();

    await checkVisionProgress(req.user._id, category).catch(err => console.error("Vision update err", err));

    res.json({ message: "Entry deleted" });
  } catch (err) {
    console.error("Delete entry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/entries/:id
router.put("/:id", protect, async (req, res) => {
  try {
    const entry = await Entry.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const {
      date,
      activityTitle,
      category,
      durationMinutes,
      journalText,
      mood,
    } = req.body;

    if (date) entry.date = new Date(date);
    if (activityTitle !== undefined) entry.activityTitle = activityTitle;
    if (category) entry.category = category;
    if (durationMinutes !== undefined) entry.durationMinutes = durationMinutes;
    if (journalText !== undefined) entry.journalText = journalText;
    if (mood) entry.mood = mood;

    const updatedEntry = await entry.save();

    await checkVisionProgress(req.user._id, updatedEntry.category).catch(err => console.error("Vision update err", err));
    if (category && category !== entry.category) {
      await checkVisionProgress(req.user._id, category).catch(err => console.error("Vision update err", err));
    }

    res.json(updatedEntry);

  } catch (err) {
    console.error("Update entry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
