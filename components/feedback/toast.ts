import { toast } from "sonner";

export function showSuccessToast(message: string, description?: string) {
  toast.success(message, { description });
}

export function showErrorToast(message: string, description?: string) {
  toast.error(message, { description });
}

export function showInfoToast(message: string, description?: string) {
  toast.message(message, { description });
}

export async function showPromiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
) {
  return toast.promise(promise, messages);
}
