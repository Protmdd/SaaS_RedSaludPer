"use client";

import * as React from "react";
import { create } from "zustand";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

/**
 * Sistema de notificaciones toast minimalista.
 *
 * Se eligió una implementación propia con Zustand en lugar de Radix Toast para
 * mantener simplicidad y evitar fricción al gatillar mensajes desde cualquier
 * componente sin requerir context providers anidados.
 */

export type ToastVariant = "default" | "success" | "error";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(opts: Omit<Toast, "id">): void {
  useToastStore.getState().showToast(opts);
}

export function Toaster(): React.ReactElement {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "surface-elevated px-4 py-3 flex items-start gap-3 animate-slide-up",
            t.variant === "success" && "border-success/30",
            t.variant === "error" && "border-destructive/30",
          )}
        >
          {t.variant === "success" && <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />}
          {t.variant === "error" && <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t.title}</p>
            {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
