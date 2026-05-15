import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    city: {
      type: String,
      trim: true,
      maxlength: 60,
      default: ""
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 800
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
