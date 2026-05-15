import mongoose from "mongoose";

const themeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "default",
      unique: true
    },
    themeConfig: {
      primaryColor: {
        type: String,
        default: "#d4af37"
      },
      buttonColor: {
        type: String,
        default: "#d4af37"
      },
      backgroundColor: {
        type: String,
        default: "#050914"
      },
      surfaceColor: {
        type: String,
        default: "#0b1224"
      },
      logoUrl: {
        type: String,
        default: ""
      },
      content: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    }
  },
  { timestamps: true }
);

export const Theme = mongoose.models.Theme || mongoose.model("Theme", themeSchema);
