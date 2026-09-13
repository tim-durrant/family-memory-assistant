export type EmergencyNotificationMode = "disabled" | "dry-run" | "live";

export function emergencyNotificationMode(value: string | undefined): EmergencyNotificationMode {
  if (value === undefined || value === "disabled") return "disabled";
  if (value === "dry-run" || value === "live") return value;
  throw new Error("EMERGENCY_NOTIFICATION_MODE must be disabled, dry-run, or live");
}
