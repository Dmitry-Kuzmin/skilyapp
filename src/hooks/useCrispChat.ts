import { useEffect } from 'react';

// Crisp types stub
declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

export function useCrispChat() {
  useEffect(() => {
    // Check if already injected
    if (document.getElementById('crisp-chat-script')) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "f75e4c12-7db0-4f2f-90fb-711aacc45df3";

    const d = document;
    const s = d.createElement("script");
    s.id = "crisp-chat-script";
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    
    // Add to head
    if (d.head) {
        d.head.appendChild(s);
    }

    // Optional: cleanup or hide when unmounting 
    return () => {
       // It's tricky to fully obliterate crisp from the DOM, 
       // but we can ask it to hide or hide its container block
       if (window.$crisp && window.$crisp.push) {
          try {
            window.$crisp.push(["do", "chat:hide"]);
          } catch (e) {}
       }
    };
  }, []);
}
