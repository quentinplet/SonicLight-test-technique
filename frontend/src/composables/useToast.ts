import { ref, type Ref } from "vue";

/** Rendered by <ToastHost /> as `alert-success` / `alert-error`: the colours are theme tokens. */
export type ToastVariant = "success" | "error";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

const DURATION_MS = 3_000;

// Module scope, not component scope: every view pushes into the single list <ToastHost />
// renders, and a toast survives the navigation that triggered it.
const toasts: Ref<Toast[]> = ref([]);
let nextId = 0;

function notify(message: string, variant: ToastVariant = "success"): void {
  const id = nextId++;
  toasts.value.push({ id, message, variant });
  setTimeout(() => dismiss(id), DURATION_MS);
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

/** Views only ever call notify(); the list itself belongs to <ToastHost />. */
export function useToast(): {
  toasts: Ref<Toast[]>;
  notify: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
} {
  return { toasts, notify, dismiss };
}
