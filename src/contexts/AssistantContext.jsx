/* eslint-disable react-refresh/only-export-components */
// contexts de l'Assistant SIRHGP : état d'ouverture partagé entre
// la Sidebar, le Header et le panneau flottant monté dans Layout.

import { createContext, useContext, useState, useCallback } from 'react';

const AssistantContext = createContext(null);

export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  return (
    <AssistantContext.Provider value={{ assistantOpen: open, setAssistantOpen: setOpen, toggleAssistant: toggle }}>
      {children}
    </AssistantContext.Provider>
  );
}

export const useAssistant = () => {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
};