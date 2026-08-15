import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readLocalReviews, writeLocalReviews } from "@/lib/reviews/local-store";
import type { Review } from "@/lib/reviews/reviews";

const MAX_NAME = 40;
const MAX_BODY = 600;

/** Formulario para que un cliente de Youtumundial deje su reseña real. */
export function ReviewForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [size, setSize] = useState("");
  const [body, setBody] = useState("");

  function submit() {
    const name = author.trim().slice(0, MAX_NAME);
    const text = body.trim().slice(0, MAX_BODY);
    if (!name) return toast.error("Please enter your name.");
    if (text.length < 10) return toast.error("Please tell us a bit more about the product (minimum 10 characters).");

    const review: Review = {
      author: name,
      country: "PE",
      rating,
      date: new Date().toISOString().slice(0, 10),
      title: text.slice(0, 40),
      body: text,
      ...(size.trim() ? { size: size.trim().toUpperCase() } : {}),
      verified: false,
    };

    const current = readLocalReviews();
    writeLocalReviews({ ...current, [slug]: [review, ...(current[slug] ?? [])] });

    setAuthor("");
    setBody("");
    setSize("");
    setRating(5);
    setOpen(false);
    toast.success("Thank you for your review!", {
      description: "It now appears on the product page.",
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <h3 className="font-medium">Share your experience</h3>

      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} stars`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              size={22}
              className={
                star <= (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground"
              }
            />
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
        <Input
          value={author}
          maxLength={MAX_NAME}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
        />
        <Input
          value={size}
          maxLength={10}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Size (optional)"
        />
      </div>

      <Textarea
        value={body}
        maxLength={MAX_BODY}
        rows={4}
        onChange={(e) => setBody(e.target.value)}
        placeholder="How did it fit? What about the fabric, style, and shipping?"
        className="mt-3"
      />

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit}>Post review</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
