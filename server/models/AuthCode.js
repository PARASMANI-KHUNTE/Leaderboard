const mongoose = require('mongoose');

// One-time short-lived authorization code for secure mobile deep-link login.
// Stored as a hash so a leaked DB record can't be used directly.
const AuthCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  used: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// TTL cleanup in MongoDB automatically removes expired codes.
AuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthCode', AuthCodeSchema);

