import { z } from 'zod';

export const TaskRequestSchema = z.object({
  prompt: z.string(),
  key: z.string().optional(),
  voice: z.boolean().optional(),
});

export const TaskResponseSchema = z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
});

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('type'), text: z.string() }),
  z.object({ type: z.literal('scroll'), dx: z.number(), dy: z.number() }),
  z.object({ type: z.literal('nav'), url: z.string() }),
  z.object({ type: z.literal('wait'), ms: z.number() }),
]);

export const StreamMessageSchema = z.object({
  type: z.enum(['screenshot', 'action', 'status']),
  data: z.any(),
});

export type TaskRequest = z.infer<typeof TaskRequestSchema>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type StreamMessage = z.infer<typeof StreamMessageSchema>;
