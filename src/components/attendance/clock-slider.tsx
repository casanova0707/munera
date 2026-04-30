"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronRight, Check } from "lucide-react";

interface ClockSliderProps {
  onSlideComplete: () => void;
  label?: string;
  disabled?: boolean;
}

export function ClockSlider({
  onSlideComplete,
  label = "スライドして出勤",
  disabled = false,
}: ClockSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const getMaxX = useCallback(() => {
    if (!trackRef.current) return 0;
    return trackRef.current.getBoundingClientRect().width - 60;
  }, []);

  const handleStart = useCallback(() => {
    if (disabled || isComplete) return;
    setIsDragging(true);
  }, [disabled, isComplete]);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left - 28;
      const maxX = getMaxX();
      const clamped = Math.max(0, Math.min(x, maxX));
      setOffsetX(clamped);

      if (clamped > maxX * 0.9) {
        setIsComplete(true);
        setIsDragging(false);
        onSlideComplete();
        // Reset after animation
        setTimeout(() => {
          setOffsetX(0);
          setIsComplete(false);
        }, 1500);
      }
    },
    [isDragging, getMaxX, onSlideComplete]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!isComplete) {
      setOffsetX(0);
    }
  }, [isDragging, isComplete]);

  return (
    <div
      ref={trackRef}
      className="slider-track select-none"
      style={{ touchAction: "none" }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX); }}
      onTouchEnd={handleEnd}
    >
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-medium text-white/40 tracking-wide">
          {label}
        </span>
      </div>

      {/* Handle */}
      <div
        className="absolute top-1 left-1 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors"
        style={{
          transform: `translateX(${offsetX}px)`,
          backgroundColor: isComplete ? "#4ade80" : "#ffffff",
          transition: isDragging ? "none" : "transform 0.3s ease-out, background-color 0.2s",
        }}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        {isComplete ? (
          <Check className="w-5 h-5 text-white" />
        ) : (
          <ChevronRight className="w-5 h-5 text-black" />
        )}
      </div>
    </div>
  );
}
