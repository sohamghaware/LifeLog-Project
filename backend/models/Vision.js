// backend/models/Vision.js
const mongoose = require("mongoose");

const visionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        imageUrl: { type: String, default: "" },
        type: { type: String, enum: ['manual', 'activity'], default: 'manual' },
        activityCategory: { type: String },
        targetHours: { type: Number, default: 0 },
        currentHours: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vision", visionSchema);
