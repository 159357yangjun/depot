use domain::{Task, TaskStatus};
use persistence_sqlite::{TaskRecord, TaskRepository};
use serde_json::Value;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum TaskEngineError {
    #[error("task persistence error: {0}")]
    Persistence(String),
}

#[derive(Clone)]
pub struct TaskEngine {
    repository: TaskRepository,
}

impl TaskEngine {
    pub fn new(repository: TaskRepository) -> Self { Self { repository } }

    pub async fn create(&self, kind: impl Into<String>, payload: Value) -> Result<Task, TaskEngineError> {
        let task = Task {
            id: Uuid::new_v4(),
            kind: kind.into(),
            status: TaskStatus::Queued,
            progress: 0,
            attempt: 0,
            max_attempts: 3,
            error: None,
            created_at: chrono::Utc::now(),
            started_at: None,
            finished_at: None,
        };
        self.repository.insert(&task, &payload).await.map_err(|e| TaskEngineError::Persistence(e.to_string()))?;
        Ok(task)
    }

    pub async fn mark_preparing(&self, id: Uuid, progress: u8) -> Result<(), TaskEngineError> {
        self.repository.update_status(id, TaskStatus::Preparing, progress, None).await.map_err(|e| TaskEngineError::Persistence(e.to_string()))?;
        Ok(())
    }

    pub async fn mark_running(&self, id: Uuid, progress: u8) -> Result<(), TaskEngineError> {
        self.repository.update_status(id, TaskStatus::Running, progress, None).await.map_err(|e| TaskEngineError::Persistence(e.to_string()))?;
        Ok(())
    }

    pub async fn complete(&self, id: Uuid) -> Result<(), TaskEngineError> {
        self.repository.update_status(id, TaskStatus::Completed, 100, None).await.map_err(|e| TaskEngineError::Persistence(e.to_string()))?;
        Ok(())
    }

    pub async fn complete_with_note(&self, id: Uuid, note: impl Into<String>) -> Result<(), TaskEngineError> {
        self.repository.update_status(id, TaskStatus::Completed, 100, Some(note.into())).await.map_err(|e| TaskEngineError::Persistence(e.to_string()))?;
        Ok(())
    }

    pub async fn fail(&self, id: Uuid, error: impl Into<String>) -> Result<(), TaskEngineError> {
        self.repository.update_status(id, TaskStatus::Failed, 100, Some(error.into())).await.map_err(|e| TaskEngineError::Persistence(e.to_string()))?;
        Ok(())
    }

    pub async fn list(&self, limit: i64) -> Result<Vec<TaskRecord>, TaskEngineError> {
        Ok(self.repository.list(limit).await.map_err(|e| TaskEngineError::Persistence(e.to_string()))?)
    }
}
