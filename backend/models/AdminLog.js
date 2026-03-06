// backend/models/AdminLog.js
const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
    {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        action: { type: String, required: true },
        details: { type: String, default: "" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("AdminLog", adminLogSchema);
