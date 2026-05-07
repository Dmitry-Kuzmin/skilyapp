import { useState, useEffect } from "react";

/**
 * Returns true when a TonConnect or Paddle overlay is open over our modal.
 * Used to disable Vaul's modal mode so the external overlay gets pointer events.
 */
export function useExternalOverlay(open: boolean): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!open) {
      setActive(false);
      return;
    }
    const handle = (e: Event) => setActive(!!(e as CustomEvent).detail?.open);
    document.addEventListener('tonconnect-modal', handle);
    document.addEventListener('paddle-checkout', handle);
    return () => {
      document.removeEventListener('tonconnect-modal', handle);
      document.removeEventListener('paddle-checkout', handle);
    };
  }, [open]);

  return active;
}
