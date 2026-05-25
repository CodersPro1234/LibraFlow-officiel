const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Le titre est obligatoire"],
      trim: true,
    },
    author: {
      type: String,
      required: [true, "L'auteur est obligatoire"],
      trim: true,
    },
    isbn: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    genre: {
      type: String,
      trim: true,
      default: "Autre",
    },
    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    totalCopies: { type: Number, required: true, min: 1, default: 1 },
    availableCopies: {
      type: Number,
      default: function () {
        return this.totalCopies;
      },
    },
    publishedYear: Number,
    publisher: String,
  },
  { timestamps: true },
);

bookSchema.pre('validate', function (next) {
  if (this.isbn === null || (typeof this.isbn === 'string' && this.isbn.trim() === '')) {
    this.isbn = undefined;
  }
  next();
});

bookSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update) {
    if (update.isbn === null || update.isbn === '') {
      update.isbn = undefined;
    }
    if (update.$set) {
      if (update.$set.isbn === null || update.$set.isbn === '') {
        update.$set.isbn = undefined;
      }
    }
  }
  next();
});

bookSchema.virtual("isAvailable").get(function () {
  return this.availableCopies > 0;
});

bookSchema.set("toJSON", { virtuals: true });

bookSchema.index({ title: "text", author: "text" });
bookSchema.index({ genre: 1 });

module.exports = mongoose.model("Book", bookSchema);
