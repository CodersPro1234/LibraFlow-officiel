const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Le nom est obligatoire'], trim: true },
  email: { type: String, required: [true, "L'email est obligatoire"], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Le mot de passe est obligatoire'], minlength: 6, select: false },
  role: { type: String, enum: ['student', 'librarian'], default: 'student' },
  studentId: { type: String, unique: true, sparse: true, trim: true },
  points: { type: Number, default: 0 },
  badges: [{
    name: String,
    icon: String,
    unlockedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);