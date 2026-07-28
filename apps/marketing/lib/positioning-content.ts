export const positioningContent = {
  sectionLabel: "Compare",
  sectionTitle: "Three tools people already reach for",
  intro:
    "History reports are a snapshot. Chat assistants can help in the moment, but vehicle details, decisions, and next steps stay spread across conversations. Neither follows through automatically month after month.",
  footnote:
    "VehicleOS connects your car's verified schedule, service history, and decisions. It follows through with the next reminder, so you do not have to reopen a chat and reconstruct the context.",
  columns: [
    { id: "history", label: "History reports", subtitle: "CARFAX and portal PDF" },
    { id: "ai", label: "Chat assistants", subtitle: "ChatGPT and Gemini" },
    { id: "vehicleos", label: "VehicleOS", subtitle: "Reminding assistant", highlight: true },
  ],
  rows: [
    {
      id: "memory",
      label: "Memory",
      history: "One-time snapshot",
      ai: "Context is fragmented across chats",
      vehicleos: "One connected vehicle record",
    },
    {
      id: "reminders",
      label: "Reminders",
      history: "None - you check manually",
      ai: "You return and ask again",
      vehicleos: "Calendar nudges before due dates",
    },
    {
      id: "schedule",
      label: "OEM schedule",
      history: "Not built in",
      ai: "Not tied to your VIN, history, or reminders",
      vehicleos: "Verified packs for your trim",
    },
    {
      id: "ongoing",
      label: "Stays on the job",
      history: "No",
      ai: "No automatic follow-through",
      vehicleos: "Yes - month after month",
    },
  ],
} as const;
