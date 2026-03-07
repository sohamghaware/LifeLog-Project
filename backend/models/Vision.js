// backend/models/Vision.js
const mongoose = require("mongoose");

const visionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        imageUrl: { type: String, default: "" },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vision", visionSchema);
