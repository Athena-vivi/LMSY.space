/**
 * 🔒 PAGE STYLES
 *
 * Global animations and styles for the upload page.
 * Extracted to keep page.tsx minimal.
 */
export function PageStyles() {
  return (
    <style jsx global>{`
      @keyframes scanline {
        0% { transform: translateY(0); }
        100% { transform: translateY(4px); }
      }
      @keyframes pulse-border {
        0%, 100% { border-color: rgba(251, 191, 36, 0.2); }
        50% { border-color: rgba(251, 191, 36, 0.4); }
      }
      @keyframes data-flow {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
      @keyframes shield-shake {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        25% { transform: translateX(-2px) rotate(-5deg); }
        75% { transform: translateX(2px) rotate(5deg); }
      }
      .reorder-item {
        cursor: grab;
        user-select: none;
      }
      .reorder-item:active {
        cursor: grabbing;
      }
      .reorder-item img {
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
      }
    `}</style>
  );
}

/**
 * Scanline background effect component
 */
export function ScanlineEffect() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)',
        backgroundSize: '100% 4px',
        animation: 'scanline 8s linear infinite',
      }}
    />
  );
}
