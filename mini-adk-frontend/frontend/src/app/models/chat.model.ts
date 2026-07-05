export interface ChatRequest {
  agent_name: string;
  message: string;
  session_id?: string | null;
}

export interface ToolCallTrace {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface ChatResponse {
  session_id: string;
  agent_name: string;
  answer: string;
  tool_calls: ToolCallTrace[];
}

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}
