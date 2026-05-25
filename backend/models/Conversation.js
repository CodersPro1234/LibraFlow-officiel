const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const MessageSchema = new Schema(
  {
    role:    { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { _id: false, timestamps: { createdAt: "timestamp", updatedAt: false } }
);

const ConversationSchema = new Schema(
  {
    user:     { type: Types.ObjectId, ref: "User", required: true, index: true },
    title:    { type: String, default: "Nouvelle conversation", maxlength: 100 },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

// Index pour trier par date décroissante
ConversationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Conversation", ConversationSchema);
