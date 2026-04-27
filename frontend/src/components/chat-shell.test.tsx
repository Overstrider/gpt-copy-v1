import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { ChatShell } from "./chat-shell";

const conversations: unknown[] = [];

beforeEach(() => {
  conversations.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/health")) {
        return Response.json({ status: "ok", model: "openrouter/free" });
      }
      if (url.endsWith("/api/conversations")) {
        return Response.json(conversations);
      }
      if (url.includes("/api/conversations/")) {
        return Response.json([]);
      }
      if (url.endsWith("/api/chat") && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return Response.json({
          conversation: {
            id: "c1",
            title: body.message,
            created_at: "2026-04-27T00:00:00Z",
            updated_at: "2026-04-27T00:00:00Z",
          },
          user_message: {
            id: "m1",
            conversation_id: "c1",
            role: "user",
            content: body.message,
            created_at: "2026-04-27T00:00:00Z",
          },
          assistant_message: {
            id: "m2",
            conversation_id: "c1",
            role: "assistant",
            content: "mock answer",
            created_at: "2026-04-27T00:00:01Z",
          },
        });
      }
      return new Response("not found", { status: 404 });
    }),
  );
});

test("shows health status and sends a message", async () => {
  render(<ChatShell />);
  expect(await screen.findByText("openrouter/free")).toBeInTheDocument();

  await userEvent.type(screen.getByPlaceholderText("Message gpt-copy-v1"), "hello");
  await userEvent.click(screen.getByLabelText("Send message"));

  await waitFor(() => expect(screen.getByText("mock answer")).toBeInTheDocument());
});
