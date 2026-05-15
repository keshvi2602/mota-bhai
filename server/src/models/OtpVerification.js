import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const OtpVerification =
  mongoose.models.OtpVerification || mongoose.model("OtpVerification", otpVerificationSchema);
