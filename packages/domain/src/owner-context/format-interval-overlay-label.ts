export const formatIntervalOverlayLabel = (input: {
  intervalMiles?: number | null;
  intervalMonths?: number | null;
}): string => {
  if (typeof input.intervalMiles === "number" && input.intervalMiles > 0) {
    return `Every ${input.intervalMiles.toLocaleString("en-US")} mi`;
  }
  if (typeof input.intervalMonths === "number" && input.intervalMonths > 0) {
    return `Every ${input.intervalMonths} mo`;
  }
  return "Custom interval";
};
