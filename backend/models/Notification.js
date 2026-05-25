const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ["info", "success", "warning", "error", "badge"],
            default: "info"
        },
        isRead: { type: Boolean, default: false },
        link: { type: String } // optionnel: lien vers une page (ex: /app/loans)
    },
    { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
