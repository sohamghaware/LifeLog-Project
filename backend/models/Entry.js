// backend/models/Entry.js
const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    activityTitle: { type: String, required: true },
    category: {
      type: String,
      enum: ["Study", "Work", "Exercise", "Social", "Entertainment", "Personal", "Other"],
      default: "Other",
    },
    durationMinutes: { type: Number, default: 0 },
    journalText: { type: String, default: "" },
    mood: {
      type: String,
      enum: ["Happy", "Neutral", "Sad", "Stressed"],
      default: "Neutral",
    },
    predictedMood: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Entry", entrySchema);
