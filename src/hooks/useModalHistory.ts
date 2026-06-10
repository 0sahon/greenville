import { useEffect, useRef } from 'react';

/**
 * Pushes a browser history entry when a modal opens so the hardware/browser
 * back button dismisses the modal instead of leaving the page.
 *
 * When the modal is closed normally (X button), the hook calls history.back()
 * to consume the dangling entry, keeping the history stack clean.
 */
export function useModalHistory(isOpen: boolean, onClose: () => void) {
  const closedByBack = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    closedByBack.current = false;
    window.history.pushState({ __modal: true }, '');

    const handler = () => {
      closedByBack.current = true;
      onClose();
    };

    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      // Modal was closed via X/normal flow — consume the dangling history entry
      if (!closedByBack.current) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
