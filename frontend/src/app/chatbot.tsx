import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { chatbotService, ChatMessageItem } from '@/services/chatbot.service';
import BottomNav from '@/components/ui/BottomNav';
import { COLORS } from '@/constants';

const SUGGESTIONS = [
  'Một tô bún bò bao nhiêu kcal?',
  'Hôm nay tôi còn ăn được bao nhiêu?',
  'So sánh bún bò và hủ tiếu',
  'Gợi ý món tối nay dưới 500 kcal',
  'Phở bò có nhiều đạm không?',
  'Giảm cân nên ăn bao nhiêu calo?',
];

const INITIAL_GREETING: ChatMessageItem = {
  role: 'assistant',
  content:
    'Xin chào! Tôi là Trợ lý Dinh dưỡng AI của SmartFood. Bạn có thể hỏi tôi về lượng calo, thành phần dinh dưỡng của món ăn, hoặc tình hình ăn uống hôm nay nhé!',
  createdAt: new Date().toISOString(),
};

export default function ChatbotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([INITIAL_GREETING]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Nạp lịch sử chat từ MongoDB khi mở màn hình
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const history = await chatbotService.getHistory();
        if (mounted && history.length > 0) {
          setMessages([INITIAL_GREETING, ...history]);
        }
      } catch (err) {
        console.warn('Không thể nạp lịch sử chat:', err);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || inputText).trim();
    if (!q || loading) return;

    setInputText('');

    const userMsg: ChatMessageItem = {
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Cuộn xuống tin nhắn mới
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const res = await chatbotService.sendQuestion(q);
      const botMsg: ChatMessageItem = {
        role: 'assistant',
        content: res.answer,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessageItem = {
        role: 'assistant',
        content:
          err.response?.data?.answer ||
          'Chatbot hiện chưa sẵn sàng kết nối tới Colab. Bạn hãy kiểm tra lại server Colab & ngrok nhé!',
        createdAt: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const handleClearChat = () => {
    Alert.alert('Xóa cuộc trò chuyện', 'Bạn có muốn làm mới cuộc trò chuyện này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Làm mới',
        style: 'destructive',
        onPress: () => setMessages([INITIAL_GREETING]),
      },
    ]);
  };

  const renderMessageItem = ({ item }: { item: ChatMessageItem }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowBot]}>
        {!isUser && (
          <View style={s.botAvatar}>
            <Ionicons name="sparkles" size={14} color="#15803D" />
          </View>
        )}

        <View style={[s.msgBubble, isUser ? s.msgBubbleUser : s.msgBubbleBot, item.isError && s.msgBubbleError]}>
          <Text style={[s.msgText, isUser ? s.msgTextUser : s.msgTextBot]}>
            {item.content}
          </Text>

          {!isUser && !item.isError && (
            <View style={s.sourceTag}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#8E9590" />
              <Text style={s.sourceText}>Nguồn: Bảng dinh dưỡng & AI RAG</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#14261C" />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Trợ lý dinh dưỡng</Text>
          <View style={s.statusRow}>
            <View style={s.onlineDot} />
            <Text style={s.statusText}>AI Thông Minh (Qwen2.5-3B + LoRA)</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.refreshBtn}
          onPress={handleClearChat}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={22} color="#14261C" />
        </TouchableOpacity>
      </View>

      {/* Chat Messages List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingHistory ? (
          <View style={s.centerLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={s.loadingHistoryText}>Đang nạp cuộc hội thoại...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, idx) => String(idx)}
            renderItem={renderMessageItem}
            contentContainerStyle={s.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              loading ? (
                <View style={s.typingRow}>
                  <View style={s.botAvatar}>
                    <Ionicons name="sparkles" size={14} color="#15803D" />
                  </View>
                  <View style={s.typingBubble}>
                    <ActivityIndicator size="small" color="#15803D" />
                    <Text style={s.typingText}>Trợ lý đang suy nghĩ...</Text>
                  </View>
                </View>
              ) : undefined
            }
          />
        )}

        {/* Suggestion Chips */}
        <View style={s.suggestionsWrap}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={SUGGESTIONS}
            keyExtractor={(item) => item}
            contentContainerStyle={s.suggestionsScroll}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.suggestionChip}
                onPress={() => handleSend(item)}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={s.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Bottom Input Row */}
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={s.inputBox}>
            <TextInput
              style={s.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Hỏi về kcal, món ăn..."
              placeholderTextColor="#8A978F"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />
          </View>

          <TouchableOpacity
            style={[s.sendButton, (!inputText.trim() || loading) && s.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.sendButtonText}>Gửi</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="chat" />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEFE8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14261C',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingHistoryText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  msgBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  msgBubbleUser: {
    backgroundColor: '#1E6B3E', // Forest green matching design
    borderBottomRightRadius: 4,
    shadowColor: '#1E6B3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  msgBubbleBot: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E7EAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  msgBubbleError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  msgTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  msgTextBot: {
    color: '#14261C',
    fontWeight: '400',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#8E9590',
    fontStyle: 'italic',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E7EAE4',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  suggestionsWrap: {
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D7DDD4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 13,
    color: '#1E6B3E',
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EBEFE8',
    gap: 10,
  },
  inputBox: {
    flex: 1,
    backgroundColor: '#F4F6F2',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1,
    borderColor: '#E2E6DF',
    maxHeight: 100,
  },
  textInput: {
    fontSize: 14,
    color: '#14261C',
    minHeight: 24,
  },
  sendButton: {
    backgroundColor: '#1E6B3E',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#A7C4B2',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
