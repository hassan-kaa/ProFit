"use client";

import { useState } from "react";

/**
 * Renders an exercise's animated GIF (from the ExerciseDB OSS dataset) — the
 * browser loops it natively, no cross-fade logic needed.
 */
export default function ExerciseAnimation({
  gifUrl,
  alt,
  className = "",
}: {
  gifUrl: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!gifUrl || failed) {
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gifUrl}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-contain"
      />
    </div>
  );
}
