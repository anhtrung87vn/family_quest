/**
 * Quest Coin icon. The 🪙 emoji is drawn silver on Apple devices and gold on
 * Android, so coins use this inline SVG to look the same (gold) everywhere.
 * Sized in `em` so it scales with the surrounding text like an emoji.
 */
export function CoinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] ${className}`}
    >
      <circle cx="12" cy="12" r="11" fill="#D97706" />
      <circle cx="12" cy="12" r="9.5" fill="#FBBF24" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#D97706" strokeWidth="1.5" />
      <path d="M7.5 6.8a7 7 0 0 1 4-1.6" fill="none" stroke="#FEF3C7" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
