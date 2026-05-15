import express from "express";
import mongoose from "mongoose";
import { Review } from "../models/Review.js";

const router = express.Router();

router.get("/", async (request, response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return response.status(503).json({ message: "Database is not connected. Reviews require MongoDB." });
    }
    const reviews = await Review.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(100);

    return response.json(reviews);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
    return response.status(500).json({ message: "Failed to load reviews." });
  }
});

router.post("/", async (request, response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return response.status(503).json({ message: "Database is not connected. Reviews require MongoDB." });
    }
    const name = String(request.body.name || "").trim();
    const city = String(request.body.city || "").trim();
    const title = String(request.body.title || "").trim();
    const message = String(request.body.message || "").trim();
    const rating = Number(request.body.rating);

    if (!name || !message || !rating) {
      return response.status(400).json({ message: "Name, rating, and review message are required." });
    }

    if (rating < 1 || rating > 5) {
      return response.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const review = await Review.create({
      city,
      isPublished: true,
      message,
      name,
      rating,
      title
    });

    return response.status(201).json(review);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
    return response.status(500).json({ message: "Failed to submit review." });
  }
});

export default router;
