import { useContext } from "react";
import { ToastContext } from "./Toast";

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast doit être utilisé dans ToastProvider");
  }
  return context;
};
