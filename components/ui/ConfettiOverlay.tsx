"use client";

import { useEffect, useState } from "react";

const PARTICLE_COUNT = 40;
const COLORS = ["#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function ConfettiOverlay({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<
    { id: number; x: number; delay: number; color: string; size: number; duration: number }[]
  >([]);

  useEffect(() => {
    if (!trigger) return;
    setParticles(
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: randomBetween(5, 95),
        delay: randomBetween(0, 0.5),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: randomBetween(6, 12),
        duration: randomBetween(1.2, 2.5),
      })),
    );
    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!particles.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
