use domain::StorageId;
use std::{collections::HashMap, sync::Arc};
use storage_core::StorageProvider;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApplicationError {
    #[error("storage {0} is not registered")]
    StorageNotFound(StorageId),
}

#[derive(Default)]
pub struct ProviderRegistry {
    providers: HashMap<StorageId, Arc<dyn StorageProvider>>,
}

impl ProviderRegistry {
    pub fn register(&mut self, id: StorageId, provider: Arc<dyn StorageProvider>) {
        self.providers.insert(id, provider);
    }

    pub fn get(&self, id: &StorageId) -> Result<Arc<dyn StorageProvider>, ApplicationError> {
        self.providers
            .get(id)
            .cloned()
            .ok_or(ApplicationError::StorageNotFound(id.clone()))
    }
}
