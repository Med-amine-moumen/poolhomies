/**
 * Full-viewport frosted layer that blurs the pool-table canvas behind any
 * form page. Sits at z-index -1 (same level as the table canvas) but later
 * in the DOM, so it paints on top of the canvas. The form content above
 * uses normal flow (in-flow content paints on top of negative-z positioned
 * descendants), so it stays crisp.
 */
export function FormBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none bg-black/45 backdrop-blur-md"
      style={{ zIndex: -1 }}
    />
  );
}
