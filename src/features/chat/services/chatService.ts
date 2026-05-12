import { api } from '@/lib/api';
import type { ChatMessage, PaginatedResponse, SearchParams, SenderRole } from '@/types';

export interface SendMessageDTO {
  content: string;
  senderId: string;
  senderName: string;
  senderRole: SenderRole;
}

export const chatService = {
  getMessages: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<ChatMessage>>('/chat', { params: { academyId, ...params } })
      .then((r) => r.data),

  sendMessage: (academyId: string, data: SendMessageDTO) =>
    api.post<ChatMessage>('/chat', { ...data, academyId }).then((r) => r.data),

  deleteMessage: (id: string) =>
    api.delete<void>(`/chat/${id}`).then((r) => r.data),
};
