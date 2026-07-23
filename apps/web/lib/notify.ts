import { toast } from "sonner";

export type FeedbackTone = "success" | "error" | "info";

export function notify(message: string, tone: FeedbackTone = "info") {
  if (!message.trim()) return;
  if (tone === "success") toast.success(message);
  else if (tone === "error") toast.error(message);
  else toast.message(message);
}

export function inferTone(message: string): FeedbackTone {
  const lower = message.toLowerCase();
  if (lower.includes("fail") || lower.includes("conflict") || lower.includes("could not")) {
    return "error";
  }
  if (
    lower.includes("complete") ||
    lower.includes("saved") ||
    lower.includes("added") ||
    lower.includes("approved") ||
    lower.includes("dismiss") ||
    lower.includes("resolved")
  ) {
    return "success";
  }
  return "info";
}

export function notifyAuto(message: string) {
  notify(message, inferTone(message));
}
