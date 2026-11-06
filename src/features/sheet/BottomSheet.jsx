import { useRef } from "react";

// Google-Maps-style sheet: "peek" shows a summary, "full" shows everything.
// Drag the handle up/down (or tap it) to switch; dragging down from peek closes it.
export default function BottomSheet({ expanded, onExpandedChange, onClose, children }) {
  const startYRef = useRef(null);

  function handlePointerDown(event) {
    startYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event) {
    if (startYRef.current === null) return;
    const deltaY = event.clientY - startYRef.current;
    startYRef.current = null;
    if (Math.abs(deltaY) < 8) {
      onExpandedChange(!expanded);
    } else if (deltaY < -40) {
      onExpandedChange(true);
    } else if (deltaY > 40) {
      if (expanded) onExpandedChange(false);
      else onClose();
    }
  }

  return (
    <section className={`bottom-sheet${expanded ? " expanded" : ""}`} aria-live="polite">
      <div
        className="sheet-handle"
        role="button"
        tabIndex={0}
        aria-label={expanded ? "パネルを縮める" : "パネルを広げる"}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyDown={(event) => event.key === "Enter" && onExpandedChange(!expanded)}
      >
        <span />
      </div>
      <button className="sheet-close icon-button" type="button" aria-label="閉じる" onClick={onClose}>×</button>
      <div className="sheet-body">{children}</div>
    </section>
  );
}
