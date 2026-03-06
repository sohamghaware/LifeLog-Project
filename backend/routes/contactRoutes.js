// backend/routes/contactRoutes.js
const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

// POST /api/contact
router.post("/", async (req, res) => {
    try {
        const { name, email, content } = req.body;
        if (!name || !email || !content) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newMessage = await Message.create({ name, email, content });
        res.status(201).json({ message: "Message sent successfully", data: newMessage });
    } catch (err) {
        console.error("Contact message error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
