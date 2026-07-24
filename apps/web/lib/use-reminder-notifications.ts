"use client";

import { useEffect, useRef } from "react";
import type { OwnerReminderItem } from "@/lib/console-types";

const requestNotificationPermission = async (): Promise<NotificationPermission | "unsupported"> => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
};

export function useReminderNotifications(reminders: OwnerReminderItem[]) {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (reminders.length === 0) return;

    void (async () => {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") return;

      for (const reminder of reminders) {
        if (notifiedRef.current.has(reminder.taskId)) continue;
        if (reminder.effectiveStatus !== "pending") continue;

        notifiedRef.current.add(reminder.taskId);
        new Notification(`VehicleOS · ${reminder.title}`, {
          body: `${reminder.deadlineLabel}. ${reminder.reason}`,
          tag: reminder.taskId,
        });
      }
    })();
  }, [reminders]);
}
