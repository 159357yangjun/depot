use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use domain::StorageCapabilities;
use reqwest::{Client, Response, StatusCode, Url};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use storage_core::{
    ConnectionReport, StorageEntry, StorageError, StorageProvider, UploadRequest, UploadResult,
};

const API_ROOT: &str = "https://gitee.com/api/v5/";
const WEB_ROOT: &str = "https://gitee.com/";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GiteeStorageConfig {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    #[serde(default)]
    pub root: String,
    pub public_base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GiteeCredentials {
    pub token: String,
}

pub struct GiteeStorage {
    client: Client,
    config: GiteeStorageConfig,
    credentials: GiteeCredentials,
}

impl GiteeStorage {
    pub fn new(config: GiteeStorageConfig, credentials: GiteeCredentials) -> Self {
        Self {
            client: Client::new(),
            config,
            credentials,
        }
    }

    fn api_url(&self, tail: &[&str]) -> Result<Url, StorageError> {
        let mut url = Url::parse(API_ROOT).map_err(|e| StorageError::Provider(e.to_string()))?;
        {
            let mut segments = url
                .path_segments_mut()
                .map_err(|_| StorageError::Provider("invalid Gitee API root".into()))?;
            for segment in tail {
                segments.push(segment);
            }
        }
        Ok(url)
    }

    fn contents_url(&self, path: &str) -> Result<Url, StorageError> {
        let mut url = self.api_url(&[
            "repos",
            &self.config.owner,
            &self.config.repo,
            "contents",
        ])?;
        {
            let mut segments = url
                .path_segments_mut()
                .map_err(|_| StorageError::Provider("invalid Gitee contents URL".into()))?;
            for segment in path.split('/').filter(|segment| !segment.is_empty()) {
                segments.push(segment);
            }
        }
        Ok(url)
    }

    fn repo_url(&self) -> Result<Url, StorageError> {
        self.api_url(&["repos", &self.config.owner, &self.config.repo])
    }

    fn branch_url(&self) -> Result<Url, StorageError> {
        self.api_url(&[
            "repos",
            &self.config.owner,
            &self.config.repo,
            "branches",
            &self.config.branch,
        ])
    }

    fn repository_path(&self, path: &str) -> String {
        let root = self.config.root.trim().trim_matches('/');
        let path = path.trim().trim_matches('/');
        match (root.is_empty(), path.is_empty()) {
            (true, true) => String::new(),
            (true, false) => path.to_string(),
            (false, true) => root.to_string(),
            (false, false) => format!("{root}/{path}"),
        }
    }

    fn logical_path(&self, repository_path: &str) -> String {
        let root = self.config.root.trim().trim_matches('/');
        let repository_path = repository_path.trim_matches('/');
        if root.is_empty() {
            return repository_path.to_string();
        }
        repository_path
            .strip_prefix(root)
            .unwrap_or(repository_path)
            .trim_start_matches('/')
            .to_string()
    }

    fn custom_public_url(&self, repository_path: &str) -> Option<String> {
        self.config.public_base_url.as_ref().map(|base| {
            format!(
                "{}/{}",
                base.trim_end_matches('/'),
                repository_path.trim_start_matches('/')
            )
        })
    }

    fn raw_public_url(&self, repository_path: &str) -> Result<String, StorageError> {
        let mut url = Url::parse(WEB_ROOT).map_err(|e| StorageError::Provider(e.to_string()))?;
        {
            let mut segments = url
                .path_segments_mut()
                .map_err(|_| StorageError::Provider("invalid Gitee web root".into()))?;
            segments.push(&self.config.owner);
            segments.push(&self.config.repo);
            segments.push("raw");
            segments.push(&self.config.branch);
            for segment in repository_path
                .split('/')
                .filter(|segment| !segment.is_empty())
            {
                segments.push(segment);
            }
        }
        Ok(url.to_string())
    }

    async fn response_error(response: Response, context: &str) -> StorageError {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let message = serde_json::from_str::<Value>(&body)
            .ok()
            .and_then(|value| {
                value
                    .get("message")
                    .and_then(Value::as_str)
                    .or_else(|| value.get("error_description").and_then(Value::as_str))
                    .map(ToOwned::to_owned)
            })
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| {
                if body.is_empty() {
                    status.to_string()
                } else {
                    body
                }
            });
        if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
            StorageError::Authentication(format!("{context}: {message}"))
        } else {
            StorageError::Provider(format!("{context} ({status}): {message}"))
        }
    }

    async fn existing_sha(&self, repository_path: &str) -> Result<Option<String>, StorageError> {
        let response = self
            .client
            .get(self.contents_url(repository_path)?)
            .query(&[
                ("access_token", self.credentials.token.as_str()),
                ("ref", self.config.branch.as_str()),
            ])
            .send()
            .await
            .map_err(|e| StorageError::Network(e.to_string()))?;
        if response.status() == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !response.status().is_success() {
            return Err(Self::response_error(response, "Gitee content lookup failed").await);
        }
        let payload: Value = response
            .json()
            .await
            .map_err(|e| StorageError::Provider(e.to_string()))?;
        Ok(payload
            .get("sha")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned))
    }

    fn entry_from_value(&self, value: &Value) -> Option<StorageEntry> {
        let name = value.get("name")?.as_str()?.to_string();
        let repository_path = value.get("path")?.as_str()?.to_string();
        let is_dir = value.get("type").and_then(Value::as_str) == Some("dir");
        let public_url = if is_dir {
            None
        } else if let Some(url) = self.custom_public_url(&repository_path) {
            Some(url)
        } else {
            self.raw_public_url(&repository_path).ok()
        };
        Some(StorageEntry {
            name,
            path: self.logical_path(&repository_path),
            is_dir,
            size_bytes: value.get("size").and_then(Value::as_u64),
            public_url,
        })
    }
}

#[async_trait]
impl StorageProvider for GiteeStorage {
    fn provider_key(&self) -> &'static str {
        "gitee"
    }

    fn capabilities(&self) -> StorageCapabilities {
        StorageCapabilities {
            upload: true,
            download: true,
            delete: true,
            list: true,
            move_object: false,
            public_url: true,
            versioning: true,
            streaming: false,
        }
    }

    async fn test_connection(&self) -> Result<ConnectionReport, StorageError> {
        let repo_response = self
            .client
            .get(self.repo_url()?)
            .query(&[("access_token", self.credentials.token.as_str())])
            .send()
            .await
            .map_err(|e| StorageError::Network(e.to_string()))?;
        if !repo_response.status().is_success() {
            return Err(Self::response_error(repo_response, "Gitee repository check failed").await);
        }
        let repo: Value = repo_response
            .json()
            .await
            .map_err(|e| StorageError::Provider(e.to_string()))?;
        let is_private = repo
            .get("private")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        if is_private
            && self
                .config
                .public_base_url
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .is_none()
        {
            return Err(StorageError::Provider(
                "Gitee repository is private. Use a public repository or configure a public base URL that can serve the uploaded files.".into(),
            ));
        }

        let branch_response = self
            .client
            .get(self.branch_url()?)
            .query(&[("access_token", self.credentials.token.as_str())])
            .send()
            .await
            .map_err(|e| StorageError::Network(e.to_string()))?;
        if !branch_response.status().is_success() {
            return Err(Self::response_error(branch_response, "Gitee branch check failed").await);
        }

        Ok(ConnectionReport {
            reachable: true,
            detail: format!(
                "Gitee repository {}/{} · {} is reachable",
                self.config.owner, self.config.repo, self.config.branch
            ),
        })
    }

    async fn upload(&self, request: UploadRequest) -> Result<UploadResult, StorageError> {
        let logical_path = request.path.clone();
        let repository_path = self.repository_path(&logical_path);
        let existing_sha = self.existing_sha(&repository_path).await?;
        let mut payload = json!({
            "access_token": self.credentials.token.clone(),
            "content": STANDARD.encode(request.body.as_ref()),
            "message": format!("chore(assets): publish {}", repository_path),
            "branch": self.config.branch.clone(),
        });
        if let Some(sha) = existing_sha.as_ref() {
            payload["sha"] = Value::String(sha.clone());
        }

        let builder = if existing_sha.is_some() {
            self.client.put(self.contents_url(&repository_path)?)
        } else {
            self.client.post(self.contents_url(&repository_path)?)
        };
        let response = builder
            .json(&payload)
            .send()
            .await
            .map_err(|e| StorageError::Network(e.to_string()))?;
        if !response.status().is_success() {
            return Err(Self::response_error(response, "Gitee upload failed").await);
        }
        let body: Value = response
            .json()
            .await
            .map_err(|e| StorageError::Provider(e.to_string()))?;
        let sha = body
            .pointer("/content/sha")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .or_else(|| {
                body.pointer("/commit/sha")
                    .and_then(Value::as_str)
                    .map(ToOwned::to_owned)
            });
        let public_url = if let Some(url) = self.custom_public_url(&repository_path) {
            Some(url)
        } else {
            Some(self.raw_public_url(&repository_path)?)
        };

        Ok(UploadResult {
            remote_path: logical_path,
            public_url,
            etag: sha,
        })
    }

    async fn download(&self, path: &str) -> Result<bytes::Bytes, StorageError> {
        let repository_path = self.repository_path(path);
        let response = self
            .client
            .get(self.contents_url(&repository_path)?)
            .query(&[
                ("access_token", self.credentials.token.as_str()),
                ("ref", self.config.branch.as_str()),
            ])
            .send()
            .await
            .map_err(|e| StorageError::Network(e.to_string()))?;
        if !response.status().is_success() {
            return Err(Self::response_error(response, "Gitee download failed").await);
        }
        let payload: Value = response
            .json()
            .await
            .map_err(|e| StorageError::Provider(e.to_string()))?;
        let content = payload
            .get("content")
            .and_then(Value::as_str)
            .ok_or_else(|| StorageError::Provider("Gitee content response did not include file bytes".into()))?;
        let compact = content.chars().filter(|ch| !ch.is_whitespace()).collect::<String>();
        let decoded = STANDARD
            .decode(compact.as_bytes())
            .map_err(|e| StorageError::Provider(format!("Gitee content decode failed: {e}")))?;
        Ok(bytes::Bytes::from(decoded))
    }

    async fn delete(&self, path: &str) -> Result<(), StorageError> {
        let repository_path = self.repository_path(path);
        let Some(sha) = self.existing_sha(&repository_path).await? else {
            return Ok(());
        };
        let payload = json!({
            "access_token": self.credentials.token.clone(),
            "message": format!("chore(assets): delete {}", repository_path),
            "sha": sha,
            "branch": self.config.branch.clone(),
        });
        let response = self
            .client
            .delete(self.contents_url(&repository_path)?)
            .json(&payload)
            .send()
            .await
            .map_err(|e| StorageError::Network(e.to_string()))?;
        if !response.status().is_success() {
            return Err(Self::response_error(response, "Gitee delete failed").await);
        }
        Ok(())
    }

    async fn list(&self, path: &str) -> Result<Vec<StorageEntry>, StorageError> {
        let repository_path = self.repository_path(path);
        let response = self
            .client
            .get(self.contents_url(&repository_path)?)
            .query(&[
                ("access_token", self.credentials.token.as_str()),
                ("ref", self.config.branch.as_str()),
            ])
            .send()
            .await
            .map_err(|e| StorageError::Network(e.to_string()))?;
        if !response.status().is_success() {
            return Err(Self::response_error(response, "Gitee browse failed").await);
        }
        let payload: Value = response
            .json()
            .await
            .map_err(|e| StorageError::Provider(e.to_string()))?;
        let values: Vec<&Value> = match payload.as_array() {
            Some(items) => items.iter().collect(),
            None => vec![&payload],
        };
        let mut entries = values
            .into_iter()
            .filter_map(|value| self.entry_from_value(value))
            .collect::<Vec<_>>();
        entries.sort_by(|left, right| {
            right
                .is_dir
                .cmp(&left.is_dir)
                .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
        });
        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn storage() -> GiteeStorage {
        GiteeStorage::new(
            GiteeStorageConfig {
                owner: "alice".into(),
                repo: "images".into(),
                branch: "main".into(),
                root: "assets/blog".into(),
                public_base_url: None,
            },
            GiteeCredentials { token: "test".into() },
        )
    }

    #[test]
    fn repository_paths_stay_relative_to_storage_root() {
        let storage = storage();
        assert_eq!(storage.repository_path("2026/a.png"), "assets/blog/2026/a.png");
        assert_eq!(storage.logical_path("assets/blog/2026/a.png"), "2026/a.png");
        assert_eq!(storage.repository_path(""), "assets/blog");
    }

    #[test]
    fn raw_url_uses_owner_repo_branch_and_path() {
        let storage = storage();
        let url = storage.raw_public_url("assets/blog/a.png").unwrap();
        assert_eq!(url, "https://gitee.com/alice/images/raw/main/assets/blog/a.png");
    }
}
