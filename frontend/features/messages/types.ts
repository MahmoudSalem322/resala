export type Message = {
  id: number;
  message: string;
  created_at: string;
};

export type MessageQuery = { page: number; limit: number; sort: "newest" | "oldest"; q: string };
export type MessagePage = { messages: Message[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
