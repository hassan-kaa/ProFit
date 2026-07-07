"use client";

import { useEffect, useState } from "react";

/**
 * Cross-fades between exercise frames (start/end position photos from
 * free-exercise-db) to create a simple 2-frame animation.
 * Renders a plain <img> — frames come from an external CDN of varying sizes.
 */
export default function ExerciseAnimation({
  frames,
  alt,
  className = "",
  intervalMs = 900,
}: {
  frames: string[];
  alt: string;
  className?: string;
  intervalMs?: number;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    const t = setInterval(
      () => setFrame((f) => (f + 1) % frames.length),
      intervalMs
    );
    return () => clearInterval(t);
  }, [frames.length, intervalMs]);

  if (frames.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-2 text-3xl ${className}`}
      >
        🏋
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {frames.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            i === frame ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
