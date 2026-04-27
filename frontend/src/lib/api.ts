import {
  ChatResponseSchema,
  ConversationSchema,
  HealthSchema,
  MessageSchema,
  type ChatResponse,
  type Conversation,
  type Health,
  type Message,
} from "./schemas";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

async function readJson<T>(response: Response, parse: (value: unknown) => T): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return parse(await response.json());
}

export async function getHealth(): Promise<Health> {
  return readJson(await fetch(`${API_BASE}/health`, { cache: "no-store" }), HealthSchema.parse);
}

export async function listConversations(): Promise<Conversation[]> {
  return readJson(await fetch(`${API_BASE}/api/conversations`, { cache: "no-store" }), (value) =>
    ConversationSchema.array().parse(value),
  );
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return readJson(await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, { cache: "no-store" }), (value) =>
    MessageSchema.array().parse(value),
  );
}

export async function sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
  return readJson(
    await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),
    ChatResponseSchema.parse,
  );
}
