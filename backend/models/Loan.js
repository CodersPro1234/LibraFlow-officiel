const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    borrowedAt: { type: Date, default: Date.now },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    returnedAt: { type: Date, default: null },
    status: {
      type: String,
      // "pending"  → demande faite par l'étudiant, pas encore confirmée
      // "active"   → confirmée par le bibliothécaire, livre sorti
      // "returned" → livre rendu
      // Note : "late" est calculé dynamiquement (status=active + dueDate dépassée)
      enum: ["pending", "active", "returned"],
      default: "pending",
    },
  },
  { timestamps: true }
);

loanSchema.virtual("isLate").get(function () {
  if (this.status === "returned") return false;
  return new Date() > this.dueDate;
});

loanSchema.set("toJSON", { virtuals: true });

loanSchema.index({ user: 1 });
loanSchema.index({ book: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ status: 1, dueDate: 1 }); // index composite pour les requêtes "late"

module.exports = mongoose.model("Loan", loanSchema);
