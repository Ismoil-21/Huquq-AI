import React, { createContext, useContext, useState, useCallback } from "react";

const ChatPanelContext = createContext(null);

export function ChatPanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <ChatPanelContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel() {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) throw new Error("useChatPanel must be inside ChatPanelProvider");
  return ctx;
}
