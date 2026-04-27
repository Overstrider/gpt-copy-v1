import { z } from "zod";

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  created_at: z.string(),
});

export const HealthSchema = z.object({
  status: z.string(),
  model: z.string(),
});

export const ChatResponseSchema = z.object({
  conversation: ConversationSchema,
  user_message: MessageSchema,
  assistant_message: MessageSchema,
});

export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
