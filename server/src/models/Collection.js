import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    legacyId: {
      type: String,
      default: "",
      index: true
    },
    handle: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    matchTag: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    image: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    productIds: {
      type: [String],
      default: []
    },
    products: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: []
    }
  },
  { timestamps: true }
);

export const Collection =
  mongoose.models.Collection || mongoose.model("Collection", collectionSchema);
