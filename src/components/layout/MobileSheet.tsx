"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The under-768px navigation sheet (DESIGN.MD:512).
 *
 * Built on a native `<dialog>` opened with `showModal()`, which gives a real
 * focus trap, Escape-to-close and an inert background for free — all of which a
 * hand-rolled overlay would have to reimplement.
 */
export function MobileSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="nav-sheet"
      aria-label="Menu"
      // Fires for Escape and for close() alike, keeping React state in step.
      onClose={onClose}
      onClick={(event) => {
        // The dialog fills the viewport, so a click on the element itself (not a
        // child) is a click on the empty area — treat it as dismissal.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="flex h-full flex-col">{children}</div>
    </dialog>
  );
}
