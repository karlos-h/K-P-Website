import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { hoverLift, revealProps } from "../lib/motion";

const CATEGORIES = ["All", "Crowd Energy", "DJ Life", "Travel", "Festivals"];

export default function MediaGallery({ items }) {
  const [category, setCategory] = useState("All");
  const [activeIndex, setActiveIndex] = useState(null);
  const reduceMotion = useReducedMotion();
  const filtered = useMemo(
    () => category === "All" ? items : items.filter((item) => item.category === category),
    [category, items],
  );
  const activeItem = activeIndex === null ? null : filtered[activeIndex];

  const move = (direction) => {
    setActiveIndex((index) => (index + direction + filtered.length) % filtered.length);
  };

  return (
    <>
      <div className="gallery__filters">
        {CATEGORIES.map((name) => (
          <button key={name} className={category === name ? "is-active" : ""} onClick={() => {
            setCategory(name);
            setActiveIndex(null);
          }}>
            {name}
          </button>
        ))}
      </div>
      <div className="gallery__grid">
        {filtered.map((item, index) => (
          <motion.button
            className="gallery-card"
            key={item.title}
            onClick={() => setActiveIndex(index)}
            {...revealProps(index * 0.05, reduceMotion)}
            {...hoverLift(reduceMotion)}
          >
            <img src={item.src} alt={`${item.title} - ${item.category}`} loading="lazy" />
            <span>
              <small>{item.category}</small>
              <strong>{item.title}</strong>
            </span>
          </motion.button>
        ))}
      </div>
      {activeItem && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={activeItem.title}>
          <button className="lightbox__close" onClick={() => setActiveIndex(null)} aria-label="Close gallery">
            <X />
          </button>
          <button className="lightbox__previous" onClick={() => move(-1)} aria-label="Previous image">
            <ChevronLeft />
          </button>
          <figure>
            <img src={activeItem.src} alt={activeItem.title} />
            <figcaption><small>{activeItem.category}</small>{activeItem.title}</figcaption>
          </figure>
          <button className="lightbox__next" onClick={() => move(1)} aria-label="Next image">
            <ChevronRight />
          </button>
        </div>
      )}
    </>
  );
}
