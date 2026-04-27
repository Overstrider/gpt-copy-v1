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

export async function sendMessageStream(
  message: string,
  conversationId: string | undefined,
  onToken: (token: string) => void,
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || `Stream failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneResponse: ChatResponse | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const parsed = parseSseEvent(rawEvent);
      if (parsed.event === "token") {
        const payload = JSON.parse(parsed.data) as { token?: string };
        if (payload.token) onToken(payload.token);
      }
      if (parsed.event === "done") {
        doneResponse = ChatResponseSchema.parse(JSON.parse(parsed.data));
      }
    }
  }

  if (!doneResponse) {
    throw new Error("Stream ended without a done event");
  }
  return doneResponse;
}

function parseSseEvent(rawEvent: string): { event: string; data: string } {
  let event = "message";
  const data: string[] = [];
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    if (line.startsWith("data:")) data.push(line.slice("data:".length).trimStart());
  }
  return { event, data: data.join("\n") };
}
