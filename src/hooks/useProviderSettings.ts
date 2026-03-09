import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  getProviderSettings,
  saveProviderSettings,
} from "../services/database-service";

export type Provider = "direct" | "bedrock" | "vertex";

export interface ProviderSettings {
  provider: Provider;
  awsRegion: string;
  awsProfile: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken: string;
  gcpProjectId: string;
  gcpRegion: string;
  modelOverride: string;
}

const DEFAULTS: ProviderSettings = {
  provider: "direct",
  awsRegion: "",
  awsProfile: "",
  awsAccessKeyId: "",
  awsSecretAccessKey: "",
  awsSessionToken: "",
  gcpProjectId: "",
  gcpRegion: "",
  modelOverride: "",
};

const SECRET_KEYS = [
  "aws_access_key_id",
  "aws_secret_access_key",
  "aws_session_token",
] as const;

export function useProviderSettings() {
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const row = await getProviderSettings();
        const [keyId, secretKey, sessionToken] = await Promise.all(
          SECRET_KEYS.map((k) =>
            invoke<string | null>("get_keyring_secret", { key: k })
          )
        );

        const loaded: ProviderSettings = {
          provider: (row?.provider as Provider) || "direct",
          awsRegion: row?.aws_region || "",
          awsProfile: row?.aws_profile || "",
          awsAccessKeyId: keyId || "",
          awsSecretAccessKey: secretKey || "",
          awsSessionToken: sessionToken || "",
          gcpProjectId: row?.gcp_project_id || "",
          gcpRegion: row?.gcp_region || "",
          modelOverride: row?.model_override || "",
        };
        setSettings(loaded);

        // Warm the Rust-side cache
        await invoke("update_provider_cache", {
          provider: loaded.provider,
          awsRegion: loaded.awsRegion || null,
          awsProfile: loaded.awsProfile || null,
          gcpProjectId: loaded.gcpProjectId || null,
          gcpRegion: loaded.gcpRegion || null,
          modelOverride: loaded.modelOverride || null,
        });
      } catch (err) {
        console.error("Failed to load provider settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (next: ProviderSettings) => {
    setSaving(true);
    try {
      // Save non-secret fields to SQLite
      await saveProviderSettings({
        provider: next.provider,
        aws_region: next.awsRegion || null,
        aws_profile: next.awsProfile || null,
        gcp_project_id: next.gcpProjectId || null,
        gcp_region: next.gcpRegion || null,
        model_override: next.modelOverride || null,
      });

      // Save/delete secrets in keyring
      const secretValues: Record<string, string> = {
        aws_access_key_id: next.awsAccessKeyId,
        aws_secret_access_key: next.awsSecretAccessKey,
        aws_session_token: next.awsSessionToken,
      };
      for (const [key, value] of Object.entries(secretValues)) {
        if (value) {
          await invoke("save_keyring_secret", { key, value });
        } else {
          await invoke("delete_keyring_secret", { key });
        }
      }

      // Update Rust-side cache
      await invoke("update_provider_cache", {
        provider: next.provider,
        awsRegion: next.awsRegion || null,
        awsProfile: next.awsProfile || null,
        gcpProjectId: next.gcpProjectId || null,
        gcpRegion: next.gcpRegion || null,
        modelOverride: next.modelOverride || null,
      });

      setSettings(next);
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, saving, save };
}
