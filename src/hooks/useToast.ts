import { useState, useCallback } from "react";

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  variant: "success" | "error";
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((title: string, body: string, variant: "success" | "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, title, body, variant }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
