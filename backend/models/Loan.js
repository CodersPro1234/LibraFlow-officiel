const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    borrowedAt:      { type: Date, default: null },
    dueDate:         { type: Date, default: null },   // fixé à la confirmation
    returnedAt:      { type: Date, default: null },
    pickupDeadline:  { type: Date, default: null },   // +24h après réservation
    qrExpired:       { type: Boolean, default: false },
    status: {
      type: String,
      // "reserved"  → étudiant a réservé, livre décrémenté, QR généré, 24h pour récupérer
      // "expired"   → délai 24h dépassé, livre remis en stock, QR invalide
      // "active"    → bibliothécaire a confirmé la remise physique du livre
      // "returned"  → livre rendu physiquement
      // "cancelled" → étudiant a annulé sa réservation, livre remis en stock
      enum: ["reserved", "expired", "active", "returned", "cancelled"],
      default: "reserved",
    },
  },
  { timestamps: true }
);

loanSchema.virtual("isLate").get(function () {
  if (this.status !== "active") return false;
  return this.dueDate && new Date() > this.dueDate;
});

loanSchema.set("toJSON", { virtuals: true });

loanSchema.index({ user: 1 });
loanSchema.index({ book: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ status: 1, pickupDeadline: 1 }); // pour l'expiration auto
loanSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model("Loan", loanSchema);
