import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin"
    },
    isAdmin: {
      type: Boolean,
      default: true
    },
    name: {
      type: String,
      default: "Mota Bhai Admin",
      trim: true
    },
    profileImage: {
      type: String,
      default: ""
    },
    otpHash: {
      type: String,
      default: ""
    },
    otpPurpose: {
      type: String,
      default: ""
    },
    otpExpiresAt: {
      type: Date,
      default: null
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    otpLastSentAt: {
      type: Date,
      default: null
    },
    otpPendingEmail: {
      type: String,
      default: ""
    },
    otpPendingPasswordHash: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
