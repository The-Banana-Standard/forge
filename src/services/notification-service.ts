import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function ensureNotificationPermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const result = await requestPermission();
    granted = result === "granted";
  }
  return granted;
}

export async function sendSessionNotification(
  tabLabel: string,
  exitCode: number | null
): Promise<void> {
  const granted = await isPermissionGranted();
  if (!granted) return;

  const succeeded = exitCode === 0 || exitCode === null;
  const title = succeeded ? "Session completed" : "Session failed";
  const body = succeeded
    ? `"${tabLabel}" finished successfully.`
    : `"${tabLabel}" exited with code ${exitCode}.`;

  sendNotification({ title, body });
}

export async function sendAttentionNotification(
  tabLabel: string
): Promise<void> {
  const granted = await isPermissionGranted();
  if (!granted) return;

  sendNotification({
    title: "Needs your input",
    body: `"${tabLabel}" is waiting for a response.`,
  });
}
