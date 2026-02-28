import { create } from "zustand";

/** Toast variant determines the color scheme. */
export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastMessage[];
  show: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (message: string, variant: ToastVariant = "success") => {
    const id = nextId++;
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  dismiss: (id: number) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

/** Convenience function to show a toast from anywhere. */
export function showToast(message: string, variant?: ToastVariant): void {
  useToastStore.getState().show(message, variant);
}
