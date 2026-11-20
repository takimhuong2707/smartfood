import { api } from '@/utils/api';

export interface ChatMessageItem {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  isError?: boolean;
}

export interface ChatbotResponse {
  answer: string;
  warnings?: string[];
  profileUsed?: boolean;
  mealsCount?: number;
  error?: string;
}

export const chatbotService = {
  async sendQuestion(question: string, lastMeal?: any[]): Promise<ChatbotResponse> {
    const res = await api.post<ChatbotResponse>(
      '/chatbot',
      { question, lastMeal },
      { timeout: 90000 } // Tối đa 90s cho Colab T4 sinh câu trả lời
    );
    return res.data;
  },

  async getHistory(): Promise<ChatMessageItem[]> {
    try {
      const res = await api.get<{ messages: ChatMessageItem[] }>('/chatbot/history');
      return res.data.messages || [];
    } catch {
      return [];
    }
  },
};
