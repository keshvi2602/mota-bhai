import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    legacyId: {
      type: String,
      default: "",
      index: true
    },
    sku: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    slug: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    description: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    discountMoney: {
      type: Number,
      default: 0,
      min: 0
    },
    category: {
      type: String,
      default: "Premium Collection"
    },
    tags: {
      type: [String],
      index: true,
      default: []
    },
    tag: {
      type: String,
      default: "New Arrival"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
