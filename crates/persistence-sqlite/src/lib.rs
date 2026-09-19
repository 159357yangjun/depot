use std::path::Path;

use chrono::{DateTime, Utc};
use domain::{
    Asset, AssetVariant, Deployment, DeploymentRole, DeploymentStatus, StorageCategory, Task,
    TaskStatus, Workflow,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions, SqliteRow},
    Row, SqlitePool,
};
use uuid::Uuid;

pub async fn connect(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}

pub async fn connect_path(path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true);
    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
}

pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageRecord {
    pub id: Uuid,
    pub name: String,
    pub provider_key: String,
    pub category: String,
    pub credential_ref: Option<String>,
    pub config_json: Value,
    pub capabilities_json: Value,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct StorageRepository {
    pool: SqlitePool,
}

impl StorageRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(&self, record: &StorageRecord) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO storages (id,name,provider_key,category,credential_ref,config_json,capabilities_json,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
            .bind(record.id.to_string())
            .bind(&record.name)
            .bind(&record.provider_key)
            .bind(&record.category)
            .bind(&record.credential_ref)
            .bind(record.config_json.to_string())
            .bind(record.capabilities_json.to_string())
            .bind(if record.enabled { 1 } else { 0 })
            .bind(record.created_at.to_rfc3339())
            .bind(record.updated_at.to_rfc3339())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<StorageRecord>, sqlx::Error> {
        let row = sqlx::query("SELECT id,name,provider_key,category,credential_ref,config_json,capabilities_json,enabled,created_at,updated_at FROM storages WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        row.map(parse_storage_row).transpose()
    }

    pub async fn list(&self) -> Result<Vec<StorageRecord>, sqlx::Error> {
        let rows = sqlx::query("SELECT id,name,provider_key,category,credential_ref,config_json,capabilities_json,enabled,created_at,updated_at FROM storages ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter().map(parse_storage_row).collect()
    }

    pub async fn usage_counts(&self, id: Uuid) -> Result<(i64, i64, i64), sqlx::Error> {
        let id_text = id.to_string();
        let deployments: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM deployments WHERE storage_id=?")
            .bind(&id_text)
            .fetch_one(&self.pool)
            .await?;
        let groups: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM storage_group_members WHERE storage_id=?")
            .bind(&id_text)
            .fetch_one(&self.pool)
            .await?;
        let workflows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workflows WHERE steps_json LIKE ?")
            .bind(format!("%{id_text}%"))
            .fetch_one(&self.pool)
            .await?;
        Ok((deployments, groups, workflows))
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM storages WHERE id=?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

fn parse_storage_row(row: SqliteRow) -> Result<StorageRecord, sqlx::Error> {
    let id: String = row.try_get("id")?;
    let config_json: String = row.try_get("config_json")?;
    let capabilities_json: String = row.try_get("capabilities_json")?;
    let created_at: String = row.try_get("created_at")?;
    let updated_at: String = row.try_get("updated_at")?;
    Ok(StorageRecord {
        id: parse_uuid(&id)?,
        name: row.try_get("name")?,
        provider_key: row.try_get("provider_key")?,
        category: row.try_get("category")?,
        credential_ref: row.try_get("credential_ref")?,
        config_json: parse_json(&config_json)?,
        capabilities_json: parse_json(&capabilities_json)?,
        enabled: row.try_get::<i64, _>("enabled")? != 0,
        created_at: parse_dt(&created_at)?,
        updated_at: parse_dt(&updated_at)?,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRecord {
    pub id: Uuid,
    pub kind: String,
    pub status: String,
    pub progress: u8,
    pub payload_json: Value,
    pub attempt: u32,
    pub max_attempts: u32,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub finished_at: Option<DateTime<Utc>>,
}

#[derive(Clone)]
pub struct TaskRepository {
    pool: SqlitePool,
}

impl TaskRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(&self, task: &Task, payload: &Value) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO tasks (id,kind,status,progress,payload_json,attempt,max_attempts,error,created_at,started_at,finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
            .bind(task.id.to_string())
            .bind(&task.kind)
            .bind(task_status_str(&task.status))
            .bind(task.progress as i64)
            .bind(payload.to_string())
            .bind(task.attempt as i64)
            .bind(task.max_attempts as i64)
            .bind(&task.error)
            .bind(task.created_at.to_rfc3339())
            .bind(task.started_at.map(|value| value.to_rfc3339()))
            .bind(task.finished_at.map(|value| value.to_rfc3339()))
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_status(
        &self,
        id: Uuid,
        status: TaskStatus,
        progress: u8,
        error: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let started = matches!(status, TaskStatus::Preparing | TaskStatus::Running);
        let finished = matches!(
            status,
            TaskStatus::Completed | TaskStatus::Failed | TaskStatus::Cancelled
        );
        sqlx::query("UPDATE tasks SET status=?, progress=?, error=?, started_at=COALESCE(started_at, CASE WHEN ? THEN ? ELSE NULL END), finished_at=CASE WHEN ? THEN ? ELSE finished_at END WHERE id=?")
            .bind(task_status_str(&status))
            .bind(progress.min(100) as i64)
            .bind(error)
            .bind(started)
            .bind(&now)
            .bind(finished)
            .bind(&now)
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn recover_interrupted(&self) -> Result<u64, sqlx::Error> {
        let result = sqlx::query("UPDATE tasks SET status='failed', progress=100, error=COALESCE(error, '应用上次退出，任务已中断'), finished_at=? WHERE status IN ('queued','preparing','running')")
            .bind(Utc::now().to_rfc3339())
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    pub async fn list(&self, limit: i64) -> Result<Vec<TaskRecord>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter()
            .map(|row| {
                let id: String = row.try_get("id")?;
                let payload: String = row.try_get("payload_json")?;
                let created: String = row.try_get("created_at")?;
                let started: Option<String> = row.try_get("started_at")?;
                let finished: Option<String> = row.try_get("finished_at")?;
                Ok(TaskRecord {
                    id: parse_uuid(&id)?,
                    kind: row.try_get("kind")?,
                    status: row.try_get("status")?,
                    progress: row.try_get::<i64, _>("progress")? as u8,
                    payload_json: parse_json(&payload)?,
                    attempt: row.try_get::<i64, _>("attempt")? as u32,
                    max_attempts: row.try_get::<i64, _>("max_attempts")? as u32,
                    error: row.try_get("error")?,
                    created_at: parse_dt(&created)?,
                    started_at: started.as_deref().map(parse_dt).transpose()?,
                    finished_at: finished.as_deref().map(parse_dt).transpose()?,
                })
            })
            .collect()
    }
}



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRecord {
    pub workflow: Workflow,
    pub description: String,
    pub source_recipe: Option<String>,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct WorkflowRepository {
    pool: SqlitePool,
}

impl WorkflowRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(
        &self,
        workflow: &Workflow,
        description: &str,
        source_recipe: Option<&str>,
        is_default: bool,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        if is_default {
            sqlx::query("UPDATE workflows SET is_default=0")
                .execute(&mut *tx)
                .await?;
        }
        let now = Utc::now().to_rfc3339();
        let steps = serde_json::to_string(&workflow.steps)
            .map_err(|error| sqlx::Error::Decode(Box::new(error)))?;
        sqlx::query("INSERT INTO workflows (id,name,steps_json,is_default,created_at,updated_at,description,source_recipe) VALUES (?,?,?,?,?,?,?,?)")
            .bind(workflow.id.to_string())
            .bind(&workflow.name)
            .bind(steps)
            .bind(if is_default { 1 } else { 0 })
            .bind(&now)
            .bind(&now)
            .bind(description)
            .bind(source_recipe)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<WorkflowRecord>, sqlx::Error> {
        let row = sqlx::query("SELECT id,name,steps_json,is_default,created_at,updated_at,description,source_recipe FROM workflows WHERE id=?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        row.map(parse_workflow_row).transpose()
    }

    pub async fn list(&self) -> Result<Vec<WorkflowRecord>, sqlx::Error> {
        let rows = sqlx::query("SELECT id,name,steps_json,is_default,created_at,updated_at,description,source_recipe FROM workflows ORDER BY is_default DESC, updated_at DESC")
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter().map(parse_workflow_row).collect()
    }

    pub async fn set_default(&self, id: Uuid) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("UPDATE workflows SET is_default=0")
            .execute(&mut *tx)
            .await?;
        sqlx::query("UPDATE workflows SET is_default=1, updated_at=? WHERE id=?")
            .bind(Utc::now().to_rfc3339())
            .bind(id.to_string())
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM workflows WHERE id=?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

fn parse_workflow_row(row: SqliteRow) -> Result<WorkflowRecord, sqlx::Error> {
    let id: String = row.try_get("id")?;
    let steps_raw: String = row.try_get("steps_json")?;
    let created_at: String = row.try_get("created_at")?;
    let updated_at: String = row.try_get("updated_at")?;
    let steps = serde_json::from_str(&steps_raw)
        .map_err(|error| sqlx::Error::Decode(Box::new(error)))?;
    Ok(WorkflowRecord {
        workflow: Workflow {
            id: parse_uuid(&id)?,
            name: row.try_get("name")?,
            steps,
        },
        description: row.try_get("description")?,
        source_recipe: row.try_get("source_recipe")?,
        is_default: row.try_get::<i64, _>("is_default")? != 0,
        created_at: parse_dt(&created_at)?,
        updated_at: parse_dt(&updated_at)?,
    })
}

#[derive(Clone)]
pub struct SettingsRepository {
    pool: SqlitePool,
}

impl SettingsRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get(&self, key: &str) -> Result<Option<Value>, sqlx::Error> {
        let row = sqlx::query("SELECT value_json FROM app_settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await?;
        row.map(|row| {
            let raw: String = row.try_get("value_json")?;
            parse_json(&raw)
        })
        .transpose()
    }

    pub async fn set(&self, key: &str, value: &Value) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO app_settings (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at")
            .bind(key)
            .bind(value.to_string())
            .bind(Utc::now().to_rfc3339())
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewStorageGroupMember {
    pub storage_id: Uuid,
    pub role: String,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageGroupMemberRecord {
    pub storage_id: Uuid,
    pub storage_name: String,
    pub provider_key: String,
    pub role: String,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageGroupRecord {
    pub id: Uuid,
    pub name: String,
    pub strategy: String,
    pub members: Vec<StorageGroupMemberRecord>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct StorageGroupRepository {
    pool: SqlitePool,
}

impl StorageGroupRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(
        &self,
        id: Uuid,
        name: &str,
        strategy: &str,
        members: &[NewStorageGroupMember],
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let mut tx = self.pool.begin().await?;
        sqlx::query("INSERT INTO storage_groups (id,name,strategy,created_at,updated_at) VALUES (?,?,?,?,?)")
            .bind(id.to_string())
            .bind(name)
            .bind(strategy)
            .bind(&now)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        for member in members {
            sqlx::query("INSERT INTO storage_group_members (group_id,storage_id,role,priority) VALUES (?,?,?,?)")
                .bind(id.to_string())
                .bind(member.storage_id.to_string())
                .bind(&member.role)
                .bind(member.priority)
                .execute(&mut *tx)
                .await?;
        }
        tx.commit().await?;
        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<StorageGroupRecord>, sqlx::Error> {
        let row = sqlx::query("SELECT id,name,strategy,created_at,updated_at FROM storage_groups WHERE id=?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        let Some(row) = row else { return Ok(None) };
        Ok(Some(self.group_from_row(row).await?))
    }

    pub async fn list(&self) -> Result<Vec<StorageGroupRecord>, sqlx::Error> {
        let rows = sqlx::query("SELECT id,name,strategy,created_at,updated_at FROM storage_groups ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await?;
        let mut groups = Vec::with_capacity(rows.len());
        for row in rows {
            groups.push(self.group_from_row(row).await?);
        }
        Ok(groups)
    }

    async fn group_from_row(&self, row: SqliteRow) -> Result<StorageGroupRecord, sqlx::Error> {
        let id_raw: String = row.try_get("id")?;
        let id = parse_uuid(&id_raw)?;
        let name: String = row.try_get("name")?;
        let strategy: String = row.try_get("strategy")?;
        let created_at: String = row.try_get("created_at")?;
        let updated_at: String = row.try_get("updated_at")?;
        let member_rows = sqlx::query("SELECT m.storage_id,s.name AS storage_name,s.provider_key,m.role,m.priority FROM storage_group_members m JOIN storages s ON s.id=m.storage_id WHERE m.group_id=? ORDER BY CASE m.role WHEN 'primary' THEN 0 WHEN 'mirror' THEN 1 ELSE 2 END, m.priority ASC")
            .bind(id.to_string())
            .fetch_all(&self.pool)
            .await?;
        let members = member_rows
            .into_iter()
            .map(|member| {
                let storage_id: String = member.try_get("storage_id")?;
                Ok(StorageGroupMemberRecord {
                    storage_id: parse_uuid(&storage_id)?,
                    storage_name: member.try_get("storage_name")?,
                    provider_key: member.try_get("provider_key")?,
                    role: member.try_get("role")?,
                    priority: member.try_get("priority")?,
                })
            })
            .collect::<Result<Vec<_>, sqlx::Error>>()?;
        Ok(StorageGroupRecord {
            id,
            name,
            strategy,
            members,
            created_at: parse_dt(&created_at)?,
            updated_at: parse_dt(&updated_at)?,
        })
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM storage_groups WHERE id=?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentWriteRecord {
    pub deployment: Deployment,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentLocationRecord {
    pub deployment_id: Uuid,
    pub storage_id: Uuid,
    pub remote_path: String,
    pub public_url: Option<String>,
    pub status: String,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentSummaryRecord {
    pub deployment_id: Uuid,
    pub storage_id: Uuid,
    pub storage_name: String,
    pub provider_key: String,
    pub role: String,
    pub status: String,
    pub remote_path: String,
    pub public_url: Option<String>,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishedAssetRecord {
    pub id: Uuid,
    pub name: String,
    pub variant_id: Uuid,
    pub mime_type: String,
    pub size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub content_hash: String,
    pub created_at: DateTime<Utc>,
    pub deployments: Vec<DeploymentSummaryRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetRepairRecord {
    pub asset_id: Uuid,
    pub name: String,
    pub mime_type: String,
    pub deployments: Vec<DeploymentLocationRecord>,
}

#[derive(Clone)]
pub struct AssetRepository {
    pool: SqlitePool,
}

impl AssetRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert_published(
        &self,
        asset: &Asset,
        variant: &AssetVariant,
        deployment: &Deployment,
    ) -> Result<(), sqlx::Error> {
        self.insert_published_many(
            asset,
            variant,
            &[DeploymentWriteRecord {
                deployment: deployment.clone(),
                last_error: None,
            }],
        )
        .await
    }

    pub async fn insert_published_many(
        &self,
        asset: &Asset,
        variant: &AssetVariant,
        deployments: &[DeploymentWriteRecord],
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("INSERT INTO assets (id,name,kind,created_at,updated_at) VALUES (?,?,?,?,?)")
            .bind(asset.id.to_string())
            .bind(&asset.name)
            .bind("image")
            .bind(asset.created_at.to_rfc3339())
            .bind(asset.updated_at.to_rfc3339())
            .execute(&mut *tx)
            .await?;
        sqlx::query("INSERT INTO asset_variants (id,asset_id,label,mime_type,size_bytes,width,height,content_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
            .bind(variant.id.to_string())
            .bind(variant.asset_id.to_string())
            .bind(&variant.label)
            .bind(&variant.mime_type)
            .bind(variant.size_bytes as i64)
            .bind(variant.width.map(|value| value as i64))
            .bind(variant.height.map(|value| value as i64))
            .bind(&variant.content_hash)
            .bind(variant.created_at.to_rfc3339())
            .execute(&mut *tx)
            .await?;
        for record in deployments {
            let deployment = &record.deployment;
            sqlx::query("INSERT INTO deployments (id,variant_id,storage_id,role,remote_path,public_url,status,deployed_at,verified_at,last_error) VALUES (?,?,?,?,?,?,?,?,?,?)")
                .bind(deployment.id.to_string())
                .bind(deployment.variant_id.to_string())
                .bind(deployment.storage_id.to_string())
                .bind(deployment_role_str(&deployment.role))
                .bind(&deployment.remote_path)
                .bind(&deployment.public_url)
                .bind(deployment_status_str(&deployment.status))
                .bind(deployment.deployed_at.map(|value| value.to_rfc3339()))
                .bind(deployment.verified_at.map(|value| value.to_rfc3339()))
                .bind(&record.last_error)
                .execute(&mut *tx)
                .await?;
        }
        tx.commit().await?;
        Ok(())
    }

    pub async fn list(&self, limit: i64) -> Result<Vec<PublishedAssetRecord>, sqlx::Error> {
        let rows = sqlx::query("SELECT a.id,a.name,a.created_at,v.id AS variant_id,v.mime_type,v.size_bytes,v.width,v.height,v.content_hash FROM assets a JOIN asset_variants v ON v.asset_id=a.id ORDER BY a.created_at DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;
        let mut out = Vec::new();
        for row in rows {
            let id_raw: String = row.try_get("id")?;
            let variant_raw: String = row.try_get("variant_id")?;
            let created: String = row.try_get("created_at")?;
            let variant_id = parse_uuid(&variant_raw)?;
            let dep_rows = sqlx::query("SELECT d.id AS deployment_id,d.storage_id,s.name AS storage_name,s.provider_key,d.role,d.status,d.remote_path,d.public_url,d.last_error FROM deployments d JOIN storages s ON s.id=d.storage_id WHERE d.variant_id=? ORDER BY CASE d.role WHEN 'primary' THEN 0 WHEN 'mirror' THEN 1 ELSE 2 END")
                .bind(variant_id.to_string())
                .fetch_all(&self.pool)
                .await?;
            let deployments = dep_rows
                .into_iter()
                .map(|deployment| {
                    let deployment_id: String = deployment.try_get("deployment_id")?;
                    let storage_id: String = deployment.try_get("storage_id")?;
                    Ok(DeploymentSummaryRecord {
                        deployment_id: parse_uuid(&deployment_id)?,
                        storage_id: parse_uuid(&storage_id)?,
                        storage_name: deployment.try_get("storage_name")?,
                        provider_key: deployment.try_get("provider_key")?,
                        role: deployment.try_get("role")?,
                        status: deployment.try_get("status")?,
                        remote_path: deployment.try_get("remote_path")?,
                        public_url: deployment.try_get("public_url")?,
                        last_error: deployment.try_get("last_error")?,
                    })
                })
                .collect::<Result<Vec<_>, sqlx::Error>>()?;
            out.push(PublishedAssetRecord {
                id: parse_uuid(&id_raw)?,
                name: row.try_get("name")?,
                variant_id,
                mime_type: row.try_get("mime_type")?,
                size_bytes: row.try_get::<i64, _>("size_bytes")? as u64,
                width: row.try_get::<Option<i64>, _>("width")?.map(|value| value as u32),
                height: row.try_get::<Option<i64>, _>("height")?.map(|value| value as u32),
                content_hash: row.try_get("content_hash")?,
                created_at: parse_dt(&created)?,
                deployments,
            });
        }
        Ok(out)
    }

    pub async fn name(&self, asset_id: Uuid) -> Result<Option<String>, sqlx::Error> {
        let row = sqlx::query("SELECT name FROM assets WHERE id=?")
            .bind(asset_id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        row.map(|row| row.try_get("name")).transpose()
    }

    pub async fn deployment_locations(
        &self,
        asset_id: Uuid,
    ) -> Result<Vec<DeploymentLocationRecord>, sqlx::Error> {
        let rows = sqlx::query("SELECT d.id AS deployment_id,d.storage_id,d.remote_path,d.public_url,d.status,d.last_error FROM deployments d JOIN asset_variants v ON v.id=d.variant_id WHERE v.asset_id=? ORDER BY d.deployed_at")
            .bind(asset_id.to_string())
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter().map(parse_deployment_location).collect()
    }

    pub async fn repair_context(
        &self,
        asset_id: Uuid,
    ) -> Result<Option<AssetRepairRecord>, sqlx::Error> {
        let row = sqlx::query("SELECT a.name,v.mime_type FROM assets a JOIN asset_variants v ON v.asset_id=a.id WHERE a.id=? ORDER BY v.created_at ASC LIMIT 1")
            .bind(asset_id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        let Some(row) = row else { return Ok(None) };
        Ok(Some(AssetRepairRecord {
            asset_id,
            name: row.try_get("name")?,
            mime_type: row.try_get("mime_type")?,
            deployments: self.deployment_locations(asset_id).await?,
        }))
    }

    pub async fn update_deployment_status(
        &self,
        deployment_id: Uuid,
        status: DeploymentStatus,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE deployments SET status=?, verified_at=? WHERE id=?")
            .bind(deployment_status_str(&status))
            .bind(Utc::now().to_rfc3339())
            .bind(deployment_id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_deployment_result(
        &self,
        deployment_id: Uuid,
        status: DeploymentStatus,
        public_url: Option<String>,
        last_error: Option<String>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE deployments SET status=?, public_url=COALESCE(?, public_url), last_error=?, verified_at=? WHERE id=?")
            .bind(deployment_status_str(&status))
            .bind(public_url)
            .bind(last_error)
            .bind(Utc::now().to_rfc3339())
            .bind(deployment_id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_asset(&self, asset_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM assets WHERE id=?")
            .bind(asset_id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

fn parse_deployment_location(row: SqliteRow) -> Result<DeploymentLocationRecord, sqlx::Error> {
    let deployment_id: String = row.try_get("deployment_id")?;
    let storage_id: String = row.try_get("storage_id")?;
    Ok(DeploymentLocationRecord {
        deployment_id: parse_uuid(&deployment_id)?,
        storage_id: parse_uuid(&storage_id)?,
        remote_path: row.try_get("remote_path")?,
        public_url: row.try_get("public_url")?,
        status: row.try_get("status")?,
        last_error: row.try_get("last_error")?,
    })
}

fn task_status_str(status: &TaskStatus) -> &'static str {
    match status {
        TaskStatus::Queued => "queued",
        TaskStatus::Preparing => "preparing",
        TaskStatus::Running => "running",
        TaskStatus::Paused => "paused",
        TaskStatus::Completed => "completed",
        TaskStatus::Failed => "failed",
        TaskStatus::Cancelled => "cancelled",
    }
}

fn deployment_role_str(role: &DeploymentRole) -> &'static str {
    match role {
        DeploymentRole::Primary => "primary",
        DeploymentRole::Mirror => "mirror",
        DeploymentRole::Backup => "backup",
    }
}

fn deployment_status_str(status: &DeploymentStatus) -> &'static str {
    match status {
        DeploymentStatus::Pending => "pending",
        DeploymentStatus::Online => "online",
        DeploymentStatus::Degraded => "degraded",
        DeploymentStatus::Failed => "failed",
        DeploymentStatus::Deleted => "deleted",
    }
}

#[allow(dead_code)]
fn category_str(category: &StorageCategory) -> &'static str {
    match category {
        StorageCategory::Object => "object",
        StorageCategory::Repository => "repository",
        StorageCategory::Protocol => "protocol",
        StorageCategory::Custom => "custom",
    }
}

fn parse_uuid(value: &str) -> Result<Uuid, sqlx::Error> {
    Uuid::parse_str(value).map_err(|error| sqlx::Error::Decode(Box::new(error)))
}

fn parse_dt(value: &str) -> Result<DateTime<Utc>, sqlx::Error> {
    DateTime::parse_from_rfc3339(value)
        .map(|value| value.with_timezone(&Utc))
        .map_err(|error| sqlx::Error::Decode(Box::new(error)))
}

fn parse_json(value: &str) -> Result<Value, sqlx::Error> {
    serde_json::from_str(value).map_err(|error| sqlx::Error::Decode(Box::new(error)))
}
