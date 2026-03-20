"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_THUMB_HEIGHT = 44;

export function ScrollProgress() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [thumbHeight, setThumbHeight] = useState(MIN_THUMB_HEIGHT);
  const [thumbTop, setThumbTop] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);

  const updateMetrics = useCallback(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;

    if (!railRef.current || scrollable <= 0) {
      setVisible(false);
      setThumbTop(0);
      return;
    }

    const railHeight = railRef.current.clientHeight;
    const nextThumbHeight = Math.max(
      MIN_THUMB_HEIGHT,
      (window.innerHeight / doc.scrollHeight) * railHeight
    );
    const maxThumbTop = Math.max(railHeight - nextThumbHeight, 0);
    const progress = window.scrollY / scrollable;

    setVisible(true);
    setThumbHeight(nextThumbHeight);
    setThumbTop(progress * maxThumbTop);
  }, []);

  useEffect(() => {
    updateMetrics();
    window.addEventListener("scroll", updateMetrics, { passive: true });
    window.addEventListener("resize", updateMetrics);

    return () => {
      window.removeEventListener("scroll", updateMetrics);
      window.removeEventListener("resize", updateMetrics);
    };
  }, [updateMetrics]);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!railRef.current) return;

      const rect = railRef.current.getBoundingClientRect();
      const railHeight = rect.height;
      const maxThumbTop = Math.max(railHeight - thumbHeight, 0);
      const nextThumbTop = Math.min(
        Math.max(event.clientY - rect.top - thumbHeight / 2, 0),
        maxThumbTop
      );
      const progress = maxThumbTop === 0 ? 0 : nextThumbTop / maxThumbTop;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;

      window.scrollTo({
        top: progress * scrollable,
        behavior: "auto",
      });
    };

    const handlePointerUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
    };

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.userSelect = "";
    };
  }, [dragging, thumbHeight]);

  const handleRailClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!railRef.current) return;

    const rect = railRef.current.getBoundingClientRect();
    const railHeight = rect.height;
    const maxThumbTop = Math.max(railHeight - thumbHeight, 0);
    const nextThumbTop = Math.min(
      Math.max(event.clientY - rect.top - thumbHeight / 2, 0),
      maxThumbTop
    );
    const progress = maxThumbTop === 0 ? 0 : nextThumbTop / maxThumbTop;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;

    window.scrollTo({
      top: progress * scrollable,
      behavior: "smooth",
    });
  };

  return (
    <div
      ref={railRef}
      onClick={handleRailClick}
      className="pointer-events-auto fixed right-2 top-24 bottom-6 z-[120] w-[6px] rounded-full transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
        background: "rgba(255,255,255,0.05)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
      aria-hidden="true"
    >
      <div
        onPointerDown={(event) => {
          event.stopPropagation();
          setDragging(true);
        }}
        className="absolute left-1/2 w-[2px] -translate-x-1/2 cursor-grab rounded-full active:cursor-grabbing"
        style={{
          top: `${thumbTop}px`,
          height: `${thumbHeight}px`,
          background:
            "linear-gradient(180deg, rgba(251,191,36,1) 0%, rgba(223,202,123,0.98) 35%, rgba(150,202,204,0.98) 68%, rgba(56,189,248,1) 100%)",
          boxShadow:
            "0 0 10px rgba(251,191,36,0.45), 0 0 18px rgba(56,189,248,0.35)",
        }}
      />
    </div>
  );
}
