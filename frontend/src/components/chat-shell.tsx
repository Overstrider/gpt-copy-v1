"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CircleAlert, CircleCheck, Loader2, Menu, Plus, Send, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import { getHealth, listConversations, listMessages, sendMessage } from "@/lib/api";
import { Providers } from "@/lib/query-client";
import type { Conversation, Message } from "@/lib/schemas";

export function ChatShell() {
  return (
    <Providers>
      <ChatExperience />
    </Providers>
  );
}

function ChatExperience() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
  });
  const messages = useQuery({
    queryKey: ["messages", activeConversationId],
    queryFn: () => listMessages(activeConversationId as string),
    enabled: Boolean(activeConversationId),
  });
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 15_000,
  });

  const activeConversation = conversations.data?.find((item) => item.id === activeConversationId);

  const mutation = useMutation({
    mutationFn: () => sendMessage(draft.trim(), activeConversationId),
    onSuccess: async (response) => {
      setDraft("");
      setActiveConversationId(response.conversation.id);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["messages", response.conversation.id] });
    },
  });

  const disabled = !draft.trim() || mutation.isPending;
  const displayMessages = useMemo(() => {
    const currentMessages = messages.data ?? [];
    if (mutation.data && mutation.data.conversation.id === activeConversationId) {
      return [...currentMessages, mutation.data.user_message, mutation.data.assistant_message];
    }
    return currentMessages;
  }, [activeConversationId, messages.data, mutation.data]);

  return (
    <main className="flex min-h-screen bg-[#171717] text-[#ececec]">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-20 w-72 border-r border-white/10 bg-[#101010] transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-sm font-semibold">gpt-copy-v1</span>
          <button
            className="rounded-md p-2 text-[#a8a8a8] hover:bg-white/10"
            onClick={() => {
              setActiveConversationId(undefined);
              setSidebarOpen(false);
            }}
            aria-label="New chat"
          >
            <Plus size={18} />
          </button>
        </div>
        <nav className="space-y-1 px-2">
          {(conversations.data ?? []).map((conversation: Conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                setActiveConversationId(conversation.id);
                setSidebarOpen(false);
              }}
              className={[
                "w-full truncate rounded-md px-3 py-2 text-left text-sm hover:bg-white/10",
                conversation.id === activeConversationId ? "bg-white/10" : "",
              ].join(" ")}
            >
              {conversation.title}
            </button>
          ))}
          {conversations.isLoading ? <p className="px-3 py-2 text-sm text-[#a8a8a8]">Loading chats...</p> : null}
        </nav>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-md p-2 md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{activeConversation?.title ?? "New chat"}</h1>
              <p className="text-xs text-[#a8a8a8]">OpenRouter through Axum backend</p>
            </div>
          </div>
          <HealthIndicator loading={health.isLoading} error={health.isError} model={health.data?.model} />
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
          <div className="flex-1 space-y-5 py-6">
            {displayMessages.length === 0 ? (
              <div className="grid min-h-[50vh] place-items-center text-center">
                <div>
                  <Bot className="mx-auto mb-4 text-[#10a37f]" size={36} />
                  <h2 className="text-2xl font-semibold">How can I help?</h2>
                </div>
              </div>
            ) : (
              displayMessages.map((message: Message) => <MessageBubble key={message.id} message={message} />)
            )}
            {mutation.isPending ? <p className="text-sm text-[#a8a8a8]">Thinking...</p> : null}
            {mutation.isError ? <p className="text-sm text-red-400">Could not send message.</p> : null}
          </div>

          <form
            className="sticky bottom-0 bg-[#171717] pb-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!disabled) mutation.mutate();
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#2f2f2f] p-2 shadow-lg">
              <textarea
                className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[#a8a8a8]"
                placeholder="Message gpt-copy-v1"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!disabled) mutation.mutate();
                  }
                }}
              />
              <button
                className="grid h-10 w-10 place-items-center rounded-full bg-[#ececec] text-black disabled:cursor-not-allowed disabled:opacity-40"
                disabled={disabled}
                aria-label="Send message"
              >
                {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function HealthIndicator({ loading, error, model }: { loading: boolean; error: boolean; model?: string }) {
  if (loading) {
    return (
      <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-[#a8a8a8]">
        <Loader2 className="animate-spin" size={14} /> Checking
      </span>
    );
  }
  if (error) {
    return (
      <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-300">
        <CircleAlert size={14} /> Offline
      </span>
    );
  }
  return (
    <span className="flex max-w-48 items-center gap-2 truncate rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
      <CircleCheck size={14} /> {model ?? "Healthy"}
    </span>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const assistant = message.role === "assistant";
  return (
    <article className={["flex gap-3", assistant ? "" : "justify-end"].join(" ")}>
      {assistant ? (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10a37f] text-black">
          <Bot size={17} />
        </div>
      ) : null}
      <div className={["max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6", assistant ? "bg-transparent" : "bg-[#2f2f2f]"].join(" ")}>
        {assistant ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : message.content}
      </div>
      {!assistant ? (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ececec] text-black">
          <UserRound size={17} />
        </div>
      ) : null}
    </article>
  );
}
