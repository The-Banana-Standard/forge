import { useState, useEffect } from "react";
import { useProviderSettings, type Provider, type ProviderSettings } from "../../hooks/useProviderSettings";

export function SettingsPanel() {
  const { settings, loading, saving, save } = useProviderSettings();
  const [form, setForm] = useState<ProviderSettings>(settings);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(settings);

  const handleSave = async () => {
    setStatus(null);
    try {
      await save(form);
      setStatus({ type: "success", msg: "Settings saved" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: "error", msg: String(err) });
    }
  };

  const update = (field: keyof ProviderSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleShow = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="settings-panel">
        <div className="settings-panel-title">Settings</div>
        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel-title">Settings</div>

      {/* Provider selection */}
      <div className="settings-section">
        <div className="settings-section-label">Provider</div>
        <div className="settings-provider-group">
          {(["direct", "bedrock", "vertex"] as Provider[]).map((p) => (
            <button
              key={p}
              className={`settings-provider-btn ${form.provider === p ? "active" : ""}`}
              onClick={() => update("provider", p)}
            >
              {p === "direct" ? "Direct" : p === "bedrock" ? "AWS Bedrock" : "Google Vertex"}
            </button>
          ))}
        </div>
      </div>

      {/* Bedrock fields */}
      {form.provider === "bedrock" && (
        <div className="settings-section">
          <div className="settings-section-label">AWS Bedrock</div>
          <div className="settings-field">
            <label>Region</label>
            <input
              type="text"
              value={form.awsRegion}
              onChange={(e) => update("awsRegion", e.target.value)}
              placeholder="us-east-1"
              autoComplete="off"
            />
          </div>
          <div className="settings-field">
            <label>Access Key ID</label>
            <div className="settings-password-wrap">
              <input
                type={showSecrets["keyId"] ? "text" : "password"}
                value={form.awsAccessKeyId}
                onChange={(e) => update("awsAccessKeyId", e.target.value)}
                placeholder="AKIA..."
                autoComplete="off"
              />
              <button
                className="settings-toggle-show"
                onClick={() => toggleShow("keyId")}
                type="button"
              >
                {showSecrets["keyId"] ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="settings-field">
            <label>Secret Access Key</label>
            <div className="settings-password-wrap">
              <input
                type={showSecrets["secret"] ? "text" : "password"}
                value={form.awsSecretAccessKey}
                onChange={(e) => update("awsSecretAccessKey", e.target.value)}
                autoComplete="off"
              />
              <button
                className="settings-toggle-show"
                onClick={() => toggleShow("secret")}
                type="button"
              >
                {showSecrets["secret"] ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="settings-field">
            <label>Session Token <span className="settings-field-hint">(optional)</span></label>
            <div className="settings-password-wrap">
              <input
                type={showSecrets["token"] ? "text" : "password"}
                value={form.awsSessionToken}
                onChange={(e) => update("awsSessionToken", e.target.value)}
                autoComplete="off"
              />
              <button
                className="settings-toggle-show"
                onClick={() => toggleShow("token")}
                type="button"
              >
                {showSecrets["token"] ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="settings-field">
            <label>AWS Profile <span className="settings-field-hint">(optional)</span></label>
            <input
              type="text"
              value={form.awsProfile}
              onChange={(e) => update("awsProfile", e.target.value)}
              placeholder="default"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* Vertex fields */}
      {form.provider === "vertex" && (
        <div className="settings-section">
          <div className="settings-section-label">Google Vertex</div>
          <div className="settings-field">
            <label>Project ID</label>
            <input
              type="text"
              value={form.gcpProjectId}
              onChange={(e) => update("gcpProjectId", e.target.value)}
              placeholder="my-gcp-project"
              autoComplete="off"
            />
          </div>
          <div className="settings-field">
            <label>Region</label>
            <input
              type="text"
              value={form.gcpRegion}
              onChange={(e) => update("gcpRegion", e.target.value)}
              placeholder="us-central1"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* Model override (always visible) */}
      <div className="settings-section">
        <div className="settings-section-label">Model</div>
        <div className="settings-field">
          <label>Model Override <span className="settings-field-hint">(optional)</span></label>
          <input
            type="text"
            value={form.modelOverride}
            onChange={(e) => update("modelOverride", e.target.value)}
            placeholder="claude-sonnet-4-20250514"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        className="settings-save-btn"
        onClick={handleSave}
        disabled={saving || !hasChanges}
      >
        {saving ? "Saving..." : "Save"}
      </button>

      {status && (
        <div className={`settings-status ${status.type}`}>{status.msg}</div>
      )}
    </div>
  );
}
