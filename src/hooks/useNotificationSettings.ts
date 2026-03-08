import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "canopy-notification-settings";

export interface NotificationSettings {
  systemNotifications: boolean;
  toastNotifications: boolean;
  tabIndicators: boolean;
}

const DEFAULTS: NotificationSettings = {
  systemNotifications: true,
  toastNotifications: true,
  tabIndicators: true,
};

function load(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  return { settings, updateSettings };
}
