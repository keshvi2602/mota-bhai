import { useEffect, useMemo, useState } from "react";
import { CartDrawer } from "./CartDrawer.jsx";
import { Header } from "./Header.jsx";
import { API_URL } from "../utils/api.js";
import "../reviews.css";

function Stars({ interactive = false, onChange, value }) {
  return (
    <div className="review-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          aria-label={`${star} star`}
          className={`review-star ${star <= value ? "is-active" : ""}`}
          disabled={!interactive}
          key={star}
          onClick={() => interactive && onChange?.(star)}
          type="button"
        >
          ★
        </button>
      ))}
    </div>
  );
}

const blankForm = {
  city: "",
  message: "",
  name: "",
  rating: 5,
  title: ""
};

export function ReviewsPage({
  cart,
  cartCount,
  cartOpen,
  cartTotal,
  content,
  onCartClose,
  onCartOpen,
  onNavigate,
  onQuantityChange,
  themeConfig
}) {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await fetch(`${API_URL}/api/reviews`);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Failed to load reviews.");
        setReviews(data);
      } catch (error) {
        setNotice(error.message || "Failed to load reviews.");
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, []);

  const averageRating = useMemo(() => {
    if (!reviews.length) return "0.0";
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    if (!form.name.trim() || !form.message.trim()) {
      setNotice("Please add your name and review message.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/reviews`, {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const savedReview = await response.json();
      if (!response.ok) throw new Error(savedReview?.message || "Failed to submit review.");
      setReviews((current) => [savedReview, ...current]);
      setForm(blankForm);
      setNotice("Thank you. Your review is now live.");
    } catch (error) {
      setNotice(error.message || "Failed to submit review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="review-shell">
      <Header cartCount={cartCount} content={content} onCartOpen={onCartOpen} onNavigate={onNavigate} themeConfig={themeConfig} />
      <main className="review-main">
        <section className="review-hero-panel">
          <p className="review-eyebrow">Customer Reviews</p>
          <h1>Snack lovers, real words.</h1>
          <p>
            Read what customers say about Mota Bhai, then share your own favourite Gujarati snack moment.
          </p>
          <div className="review-summary-card">
            <strong>{averageRating}</strong>
            <div>
              <Stars value={Math.round(Number(averageRating))} />
              <span>{reviews.length} public reviews</span>
            </div>
          </div>
        </section>

        <section className="review-grid">
          <form className="review-form-card" onSubmit={handleSubmit}>
            <h2>Write a Review</h2>
            <label>
              Name *
              <input maxLength="60" onChange={(event) => updateForm("name", event.target.value)} placeholder="Your name" value={form.name} />
            </label>
            <label>
              City
              <input maxLength="60" onChange={(event) => updateForm("city", event.target.value)} placeholder="Surat, Ahmedabad, Berlin" value={form.city} />
            </label>
            <label>
              Rating *
              <Stars interactive onChange={(rating) => updateForm("rating", rating)} value={form.rating} />
            </label>
            <label>
              Review title
              <input maxLength="100" onChange={(event) => updateForm("title", event.target.value)} placeholder="Fresh and crunchy" value={form.title} />
            </label>
            <label>
              Message *
              <textarea maxLength="800" onChange={(event) => updateForm("message", event.target.value)} placeholder="Write your honest review..." rows="5" value={form.message} />
            </label>
            {notice && <p className="review-notice">{notice}</p>}
            <button disabled={saving} type="submit">
              {saving ? "Submitting..." : "Submit Review"}
            </button>
          </form>

          <div className="review-list">
            {loading ? (
              <p className="review-empty">Loading reviews...</p>
            ) : reviews.length ? (
              reviews.map((review) => (
                <article className="review-card" key={review._id}>
                  <div className="review-card-top">
                    <div>
                      <h3>{review.name}</h3>
                      <p>{review.city || "Verified Customer"}</p>
                    </div>
                    <Stars value={Number(review.rating || 0)} />
                  </div>
                  {review.title && <h4>{review.title}</h4>}
                  <p>{review.message}</p>
                  <time>
                    {new Date(review.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </time>
                </article>
              ))
            ) : (
              <p className="review-empty">No reviews yet. Be the first one.</p>
            )}
          </div>
        </section>
      </main>
      <CartDrawer
        cart={cart}
        cartCount={cartCount}
        cartTotal={cartTotal}
        content={content}
        isOpen={cartOpen}
        onClose={onCartClose}
        onQuantityChange={onQuantityChange}
      />
    </div>
  );
}
