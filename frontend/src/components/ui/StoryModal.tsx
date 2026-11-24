import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { User, UserNote } from '@/types/auth';
import { userService } from '@/services/user.service';
import UserAvatar from './UserAvatar';

export type AvatarModalMode = 'closed' | 'menu' | 'note';

const QUICK_EMOJIS = ['🥗', '🍜', '🔥', '💪', '🧋', '😋', '✨', '🎯'];

type StoryModalProps = {
  mode: AvatarModalMode;
  onClose: () => void;
  onChangeMode: (next: AvatarModalMode) => void;
  targetUser?: {
    fullName?: string;
    avatarUrl?: string;
    role?: 'user' | 'admin';
    note?: UserNote;
  } | null;
  isOwnProfile?: boolean;
  showGoProfileOption?: boolean;
  onGoProfile?: () => void;
  onPickAvatarCamera?: () => void;
  onPickAvatarLibrary?: () => void;
  onUserUpdated?: (updated: User) => void;
  onFeedbackMessage?: (type: 'success' | 'error', text: string) => void;
};

export default function StoryModal({
  mode,
  onClose,
  onChangeMode,
  targetUser,
  isOwnProfile = true,
  showGoProfileOption = false,
  onGoProfile,
  onPickAvatarCamera,
  onPickAvatarLibrary,
  onUserUpdated,
  onFeedbackMessage,
}: StoryModalProps) {
  const insets = useSafeAreaInsets();
  const currentNote = targetUser?.note?.text || '';
  const hasNote = Boolean(currentNote.trim());

  const [noteInput, setNoteInput] = useState(currentNote);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'note') {
      setNoteInput(targetUser?.note?.text || '');
    }
  }, [mode, targetUser?.note?.text]);

  const handleSaveNote = async () => {
    if (submitting) return;
    const trimmed = noteInput.trim();
    if (!trimmed) {
      onFeedbackMessage?.('error', 'Vui lòng nhập nội dung ghi chú');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await userService.saveNote(trimmed);
      onUserUpdated?.(updated);
      onClose();
      onFeedbackMessage?.('success', 'Đã cập nhật ghi chú!');
    } catch (e: any) {
      onFeedbackMessage?.('error', e?.message || 'Không thể lưu ghi chú');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const updated = await userService.deleteNote();
      onUserUpdated?.(updated);
      setNoteInput('');
      onClose();
      onFeedbackMessage?.('success', 'Đã xóa ghi chú.');
    } catch (e: any) {
      onFeedbackMessage?.('error', e?.message || 'Không thể xóa ghi chú');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuiltInAvatarPick = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        if (onPickAvatarCamera) return onPickAvatarCamera();
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          const updated = await userService.uploadAvatar(res.assets[0].uri);
          onUserUpdated?.(updated);
        }
      } else {
        if (onPickAvatarLibrary) return onPickAvatarLibrary();
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          const updated = await userService.uploadAvatar(res.assets[0].uri);
          onUserUpdated?.(updated);
        }
      }
    } catch (e: any) {
      onFeedbackMessage?.('error', e?.message || 'Không thể cập nhật ảnh đại diện');
    }
  };

  if (mode === 'closed') return null;

  // ================= 1. SLEEK BOTTOM SHEET MENU =================
  if (mode === 'menu') {
    return (
      <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
        <Pressable style={s.sheetBackdrop} onPress={onClose}>
          <Pressable style={[s.sheetContainer, { paddingBottom: Math.max(insets.bottom, 18) }]} onPress={() => {}}>
            <View style={s.sheetHandle} />

            <View style={s.sheetProfileHeader}>
              <UserAvatar
                uri={targetUser?.avatarUrl}
                name={targetUser?.fullName}
                size={48}
                borderRadius={24}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle} numberOfLines={1}>
                  {targetUser?.fullName || 'Tài khoản của bạn'}
                </Text>
                {hasNote && (
                  <Text style={s.currentNotePreview} numberOfLines={1}>
                    “{currentNote}”
                  </Text>
                )}
              </View>
            </View>

            <View style={s.sheetOptionsGroup}>
              {isOwnProfile && (
                <TouchableOpacity
                  style={s.sheetOption}
                  activeOpacity={0.75}
                  onPress={() => onChangeMode('note')}
                >
                  <View style={[s.sheetIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={s.sheetOptionTitle}>
                    {hasNote ? 'Chỉnh sửa ghi chú' : 'Để lại ghi chú'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {isOwnProfile && hasNote && (
                <TouchableOpacity
                  style={s.sheetOption}
                  activeOpacity={0.75}
                  onPress={handleDeleteNote}
                  disabled={submitting}
                >
                  <View style={[s.sheetIconWrap, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={[s.sheetOptionTitle, { color: '#DC2626' }]}>Xóa ghi chú hiện tại</Text>
                  <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
                </TouchableOpacity>
              )}

              {isOwnProfile && Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={s.sheetOption}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    setTimeout(() => handleBuiltInAvatarPick(true), 150);
                  }}
                >
                  <View style={[s.sheetIconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="camera-outline" size={20} color="#15803D" />
                  </View>
                  <Text style={s.sheetOptionTitle}>Chụp ảnh đại diện mới</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {isOwnProfile && (
                <TouchableOpacity
                  style={s.sheetOption}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    setTimeout(() => handleBuiltInAvatarPick(false), 150);
                  }}
                >
                  <View style={[s.sheetIconWrap, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="images-outline" size={20} color="#0284C7" />
                  </View>
                  <Text style={s.sheetOptionTitle}>Chọn ảnh đại diện từ thư viện</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {showGoProfileOption && onGoProfile && (
                <TouchableOpacity
                  style={s.sheetOption}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    onGoProfile();
                  }}
                >
                  <View style={[s.sheetIconWrap, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="person-outline" size={19} color="#7E22CE" />
                  </View>
                  <Text style={s.sheetOptionTitle}>Mở trang Hồ sơ thể trạng</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={s.sheetCancelBtn} activeOpacity={0.8} onPress={onClose}>
              <Text style={s.sheetCancelText}>Đóng</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // ================= 2. INSTAGRAM NOTE COMPOSER / VIEWER =================
  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.noteBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[s.noteCard, { marginBottom: Math.max(insets.bottom, 16) }]}>
          {/* Top Bar */}
          <View style={s.noteTopBar}>
            <TouchableOpacity style={s.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={s.noteHeaderTitle}>{isOwnProfile ? 'Ghi chú mới' : 'Ghi chú'}</Text>
            {isOwnProfile ? (
              <TouchableOpacity
                onPress={handleSaveNote}
                disabled={submitting || !noteInput.trim()}
                style={[s.shareTextBtn, (!noteInput.trim() || submitting) && { opacity: 0.45 }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#15803D" />
                ) : (
                  <Text style={s.shareTextLabel}>Chia sẻ</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 54 }} />
            )}
          </View>

          {/* Instagram Thought Bubble + Avatar Centerpiece */}
          <View style={s.igCenterStage}>
            <View style={s.bigBubble}>
              {isOwnProfile ? (
                <>
                  <TextInput
                    style={s.bigBubbleInput}
                    value={noteInput}
                    onChangeText={setNoteInput}
                    placeholder="Chia sẻ suy nghĩ..."
                    placeholderTextColor="#9CA3AF"
                    maxLength={60}
                    multiline
                    autoFocus
                  />
                  <Text style={s.charCount}>{noteInput.length}/60</Text>
                </>
              ) : (
                <Text style={s.bigBubbleReadText}>{currentNote || '...'}</Text>
              )}
            </View>

            {/* Thought Bubble Tail Circles */}
            <View style={s.bigTailWrap}>
              <View style={s.bigTailCircle} />
              <View style={s.smallTailCircle} />
            </View>

            <UserAvatar
              uri={targetUser?.avatarUrl}
              name={targetUser?.fullName}
              size={86}
              borderRadius={43}
            />
            <Text style={s.stageUserName}>{targetUser?.fullName || ''}</Text>
          </View>

          {/* Quick Emoji Bar for Owner */}
          {isOwnProfile && (
            <View style={s.emojiRow}>
              {QUICK_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={s.emojiBtn}
                  onPress={() =>
                    setNoteInput((prev) => (prev.length + em.length <= 60 ? prev + em : prev))
                  }
                >
                  <Text style={s.emojiText}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isOwnProfile && hasNote && (
            <TouchableOpacity
              style={s.deleteNoteLink}
              onPress={handleDeleteNote}
              disabled={submitting}
            >
              <Text style={s.deleteNoteLinkText}>Xóa ghi chú hiện tại</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14261C',
  },
  currentNotePreview: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 2,
  },
  sheetOptionsGroup: {
    gap: 8,
    marginBottom: 14,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sheetIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  sheetCancelBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  // Instagram Note Composer Modal
  noteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noteCard: {
    backgroundColor: '#F8FAF7',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  noteTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14261C',
  },
  shareTextBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
  },
  shareTextLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  igCenterStage: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  bigBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 210,
    maxWidth: 270,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bigBubbleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    minHeight: 42,
  },
  bigBubbleReadText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    paddingVertical: 6,
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  bigTailWrap: {
    alignItems: 'center',
    marginTop: -2,
    marginBottom: 4,
    paddingRight: 28,
  },
  bigTailCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  smallTailCircle: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stageUserName: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 18,
  },
  deleteNoteLink: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  deleteNoteLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
