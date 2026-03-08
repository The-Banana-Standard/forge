use crate::state::{AppState, Provider, ProviderSettings};
use std::collections::HashMap;
use tauri::State;

const KEYRING_SERVICE: &str = "canopy";

#[tauri::command]
pub fn save_keyring_secret(key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &key)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry
        .set_password(&value)
        .map_err(|e| format!("Failed to save secret: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_keyring_secret(key: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &key)
        .map_err(|e| format!("Keyring error: {}", e))?;
    match entry.get_password() {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read secret: {}", e)),
    }
}

#[tauri::command]
pub fn delete_keyring_secret(key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &key)
        .map_err(|e| format!("Keyring error: {}", e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete secret: {}", e)),
    }
}

#[tauri::command]
pub fn update_provider_cache(
    state: State<'_, AppState>,
    provider: String,
    aws_region: Option<String>,
    aws_profile: Option<String>,
    gcp_project_id: Option<String>,
    gcp_region: Option<String>,
    model_override: Option<String>,
) -> Result<(), String> {
    let prov = match provider.as_str() {
        "bedrock" => Provider::Bedrock,
        "vertex" => Provider::Vertex,
        _ => Provider::Direct,
    };

    let read_secret = |key: &str| -> Option<String> {
        keyring::Entry::new(KEYRING_SERVICE, key)
            .ok()
            .and_then(|e| e.get_password().ok())
    };

    let settings = ProviderSettings {
        provider: prov,
        aws_region,
        aws_profile,
        aws_access_key_id: read_secret("aws_access_key_id"),
        aws_secret_access_key: read_secret("aws_secret_access_key"),
        aws_session_token: read_secret("aws_session_token"),
        gcp_project_id,
        gcp_region,
        model_override,
    };

    let mut cache = state
        .provider_settings
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    *cache = Some(settings);
    Ok(())
}

#[allow(dead_code)]
#[tauri::command]
pub fn get_provider_env_vars(state: State<'_, AppState>) -> Result<HashMap<String, String>, String> {
    let cache = state
        .provider_settings
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;

    let Some(settings) = cache.as_ref() else {
        return Ok(HashMap::new());
    };

    let mut env = HashMap::new();

    match settings.provider {
        Provider::Direct => {}
        Provider::Bedrock => {
            env.insert("CLAUDE_CODE_USE_BEDROCK".to_string(), "1".to_string());
            if let Some(ref r) = settings.aws_region {
                env.insert("AWS_REGION".to_string(), r.clone());
            }
            if let Some(ref p) = settings.aws_profile {
                env.insert("AWS_PROFILE".to_string(), p.clone());
            }
            if let Some(ref k) = settings.aws_access_key_id {
                env.insert("AWS_ACCESS_KEY_ID".to_string(), k.clone());
            }
            if let Some(ref s) = settings.aws_secret_access_key {
                env.insert("AWS_SECRET_ACCESS_KEY".to_string(), s.clone());
            }
            if let Some(ref t) = settings.aws_session_token {
                env.insert("AWS_SESSION_TOKEN".to_string(), t.clone());
            }
        }
        Provider::Vertex => {
            env.insert("CLAUDE_CODE_USE_VERTEX".to_string(), "1".to_string());
            if let Some(ref p) = settings.gcp_project_id {
                env.insert("CLOUD_ML_PROJECT_ID".to_string(), p.clone());
            }
            if let Some(ref r) = settings.gcp_region {
                env.insert("CLOUD_ML_REGION".to_string(), r.clone());
            }
        }
    }

    if let Some(ref m) = settings.model_override {
        if !m.is_empty() {
            env.insert("ANTHROPIC_MODEL".to_string(), m.clone());
        }
    }

    Ok(env)
}
