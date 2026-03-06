// backend/routes/visionRoutes.js
const express = require("express");
const Vision = require("../models/Vision");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/vision
router.get("/", protect, async (req, res) => {
    try {
        const visions = await Vision.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(visions);
    } catch (err) {
        console.error("Get visions error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/vision
router.post("/", protect, async (req, res) => {
    try {
        const { title, imageUrl } = req.body;

        if (!title || !imageUrl) {
            return res.status(400).json({ message: "Title and Image URL are required" });
        }

        const vision = await Vision.create({
            user: req.user._id,
            title,
            imageUrl,
        });

        res.status(201).json(vision);
    } catch (err) {
        console.error("Create vision error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/vision/:id
router.delete("/:id", protect, async (req, res) => {
    try {
        const vision = await Vision.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!vision) {
            return res.status(404).json({ message: "Vision item not found" });
        }

        await vision.deleteOne();
        res.json({ message: "Vision item deleted" });
    } catch (err) {
        console.error("Delete vision error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
