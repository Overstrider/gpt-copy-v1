use std::{env, net::SocketAddr, sync::Arc};

use async_trait::async_trait;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderValue, Method, StatusCode},
    response::{
        IntoResponse, Response,
        sse::{Event, KeepAlive, Sse},
    },
    routing::{get, post},
};
use futures_util::{StreamExt, stream};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use time::OffsetDateTime;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use validator::Validate;

#[tokio::main]
async fn main() -> Result<(), AppError> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = Config::from_env();
    let state = AppState::new(cfg).await?;
    let app = build_router(state);
    let addr: SocketAddr = format!(
        "0.0.0.0:{}",
        env::var("BACKEND_PORT").unwrap_or_else(|_| "8080".into())
    )
    .parse()
    .expect("valid BACKEND_PORT");

    tracing::info!(%addr, "backend listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
    provider: Arc<dyn ChatProvider>,
    model: String,
}

impl AppState {
    async fn new(cfg: Config) -> Result<Self, AppError> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&cfg.database_url)
            .await?;
        migrate(&pool).await?;
        Ok(Self {
            pool,
            provider: Arc::new(OpenRouterProvider::new(
                cfg.openrouter_api_key,
                cfg.model.clone(),
            )),
            model: cfg.model,
        })
    }

    #[cfg(test)]
    async fn for_tests(provider: Arc<dyn ChatProvider>) -> Result<Self, AppError> {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await?;
        migrate(&pool).await?;
        Ok(Self {
            pool,
            provider,
            model: "test/free".into(),
        })
    }
}

#[derive(Clone)]
struct Config {
    database_url: String,
    openrouter_api_key: String,
    model: String,
}

impl Config {
    fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite://gpt-copy.db".into()),
            openrouter_api_key: env::var("OPENROUTER_API_KEY").unwrap_or_default(),
            model: env::var("OPENROUTER_MODEL").unwrap_or_else(|_| "openrouter/free".into()),
        }
    }
}

fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(tower_http::cors::Any);

    Router::new()
        .route("/health", get(health))
        .route(
            "/api/conversations",
            get(list_conversations).post(create_conversation),
        )
        .route("/api/conversations/{id}/messages", get(list_messages))
        .route("/api/chat", post(chat))
        .route("/api/chat/stream", post(chat_stream))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn migrate(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id)
        );
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    model: String,
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        model: state.model,
    })
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct Conversation {
    id: String,
    title: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
struct CreateConversationRequest {
    title: Option<String>,
}

async fn list_conversations(
    State(state): State<AppState>,
) -> Result<Json<Vec<Conversation>>, AppError> {
    let rows = sqlx::query_as::<_, Conversation>(
        "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}

async fn create_conversation(
    State(state): State<AppState>,
    Json(req): Json<CreateConversationRequest>,
) -> Result<Json<Conversation>, AppError> {
    let conversation =
        insert_conversation(&state.pool, req.title.unwrap_or_else(|| "New chat".into())).await?;
    Ok(Json(conversation))
}

async fn insert_conversation(pool: &SqlitePool, title: String) -> Result<Conversation, AppError> {
    let now = OffsetDateTime::now_utc().to_string();
    let conversation = Conversation {
        id: Uuid::new_v4().to_string(),
        title,
        created_at: now.clone(),
        updated_at: now,
    };
    sqlx::query(
        "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .bind(&conversation.id)
    .bind(&conversation.title)
    .bind(&conversation.created_at)
    .bind(&conversation.updated_at)
    .execute(pool)
    .await?;
    Ok(conversation)
}

#[derive(Debug, Serialize, sqlx::FromRow, Clone)]
struct Message {
    id: String,
    conversation_id: String,
    role: String,
    content: String,
    created_at: String,
}

async fn list_messages(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Vec<Message>>, AppError> {
    let rows = sqlx::query_as::<_, Message>(
        "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize, Validate)]
struct ChatRequest {
    conversation_id: Option<String>,
    #[validate(length(min = 1, max = 8000))]
    message: String,
}

#[derive(Debug, Serialize)]
struct ChatResponse {
    conversation: Conversation,
    user_message: Message,
    assistant_message: Message,
}

async fn chat(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, AppError> {
    req.validate()
        .map_err(|err| AppError::Validation(err.to_string()))?;
    let response = complete_chat(state, req).await?;
    Ok(Json(response))
}

async fn chat_stream(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Result<Sse<impl futures_util::Stream<Item = Result<Event, std::convert::Infallible>>>, AppError>
{
    req.validate()
        .map_err(|err| AppError::Validation(err.to_string()))?;
    let response = complete_chat(state, req).await?;
    let words: Vec<String> = response
        .assistant_message
        .content
        .split_whitespace()
        .map(|word| format!("{word} "))
        .collect();
    let done_payload = serde_json::to_string(&response.assistant_message)?;
    let stream = stream::iter(words.into_iter().map(|token| {
        let data = serde_json::json!({ "type": "token", "token": token }).to_string();
        Ok(Event::default().event("token").data(data))
    }))
    .chain(stream::once(async move {
        Ok(Event::default().event("done").data(done_payload))
    }));
    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

async fn complete_chat(state: AppState, req: ChatRequest) -> Result<ChatResponse, AppError> {
    let conversation = match req.conversation_id {
        Some(id) => get_conversation(&state.pool, &id).await?,
        None => {
            let title = req.message.chars().take(48).collect::<String>();
            insert_conversation(
                &state.pool,
                if title.is_empty() {
                    "New chat".into()
                } else {
                    title
                },
            )
            .await?
        }
    };

    let user_message = insert_message(&state.pool, &conversation.id, "user", &req.message).await?;
    let history = get_messages(&state.pool, &conversation.id).await?;
    let answer = state.provider.complete(&history).await?;
    let assistant_message =
        insert_message(&state.pool, &conversation.id, "assistant", &answer).await?;
    let now = OffsetDateTime::now_utc().to_string();
    sqlx::query("UPDATE conversations SET updated_at = ? WHERE id = ?")
        .bind(now)
        .bind(&conversation.id)
        .execute(&state.pool)
        .await?;

    Ok(ChatResponse {
        conversation,
        user_message,
        assistant_message,
    })
}

async fn get_conversation(pool: &SqlitePool, id: &str) -> Result<Conversation, AppError> {
    sqlx::query_as::<_, Conversation>(
        "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)
}

async fn get_messages(pool: &SqlitePool, conversation_id: &str) -> Result<Vec<Message>, AppError> {
    let rows = sqlx::query_as::<_, Message>(
        "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

async fn insert_message(
    pool: &SqlitePool,
    conversation_id: &str,
    role: &str,
    content: &str,
) -> Result<Message, AppError> {
    let msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.into(),
        role: role.into(),
        content: content.into(),
        created_at: OffsetDateTime::now_utc().to_string(),
    };
    sqlx::query("INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(&msg.id)
        .bind(&msg.conversation_id)
        .bind(&msg.role)
        .bind(&msg.content)
        .bind(&msg.created_at)
        .execute(pool)
        .await?;
    Ok(msg)
}

#[async_trait]
trait ChatProvider: Send + Sync {
    async fn complete(&self, messages: &[Message]) -> Result<String, AppError>;
}

struct OpenRouterProvider {
    api_key: String,
    model: String,
    client: Client,
}

impl OpenRouterProvider {
    fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: Client::new(),
        }
    }
}

#[async_trait]
impl ChatProvider for OpenRouterProvider {
    async fn complete(&self, messages: &[Message]) -> Result<String, AppError> {
        if self.api_key.is_empty() {
            return Ok(
                "OpenRouter is not configured. Set OPENROUTER_API_KEY to enable live responses."
                    .into(),
            );
        }

        let payload = serde_json::json!({
            "model": self.model,
            "messages": messages.iter().map(|msg| serde_json::json!({
                "role": msg.role,
                "content": msg.content,
            })).collect::<Vec<_>>()
        });

        let value: serde_json::Value = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .header("HTTP-Referer", "https://github.com/Overstrider/gpt-copy-v1")
            .header("X-Title", "gpt-copy-v1")
            .json(&payload)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let content = value["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("The provider returned an empty response.")
            .to_string();
        Ok(content)
    }
}

#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("database error")]
    Sqlx(#[from] sqlx::Error),
    #[error("http client error")]
    Reqwest(#[from] reqwest::Error),
    #[error("io error")]
    Io(#[from] std::io::Error),
    #[error("json error")]
    Json(#[from] serde_json::Error),
    #[error("validation error: {0}")]
    Validation(String),
    #[error("not found")]
    NotFound,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::Validation(_) => StatusCode::BAD_REQUEST,
            AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let body = Json(ErrorBody {
            error: self.to_string(),
        });
        (status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    struct MockProvider;

    #[async_trait]
    impl ChatProvider for MockProvider {
        async fn complete(&self, messages: &[Message]) -> Result<String, AppError> {
            let last = messages.last().map(|m| m.content.as_str()).unwrap_or("");
            Ok(format!("mock answer to: {last}"))
        }
    }

    async fn test_app() -> Router {
        let state = AppState::for_tests(Arc::new(MockProvider)).await.unwrap();
        build_router(state)
    }

    #[tokio::test]
    async fn health_returns_ok() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn rejects_empty_chat_message() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/chat")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"message":""}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn persists_conversation_and_messages() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/chat")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"message":"hello"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(json["user_message"]["content"], "hello");
        assert_eq!(
            json["assistant_message"]["content"],
            "mock answer to: hello"
        );
    }
}
