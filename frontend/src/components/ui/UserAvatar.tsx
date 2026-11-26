import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/constants';

const BASE_HOST = API_URL.replace(/\/api\/?$/, '');

export function resolveMediaUri(mediaUrl?: string | null): string | null {
  if (!mediaUrl) return null;
  if (
    mediaUrl.startsWith('http://') ||
    mediaUrl.startsWith('https://') ||
    mediaUrl.startsWith('file:') ||
    mediaUrl.startsWith('content:') ||
    mediaUrl.startsWith('blob:') ||
    mediaUrl.startsWith('data:')
  ) {
    return mediaUrl;
  }
  return `${BASE_HOST}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
}

export const resolveAvatarUri = resolveMediaUri;

type UserAvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  borderRadius?: number;
  noteText?: string | null;
  showNotePrompt?: boolean;
  noteAlign?: 'left' | 'right';
  showEditBadge?: boolean;
};

export default function UserAvatar({
  uri,
  size = 42,
  borderRadius,
  noteText,
  showNotePrompt = false,
  noteAlign = 'left',
  showEditBadge = false,
}: UserAvatarProps) {
  const resolved = resolveMediaUri(uri);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [resolved]);

  const radius = borderRadius ?? size / 2;
  const iconSize = Math.max(15, Math.round(size * 0.5));
  const hasNote = Boolean(noteText && noteText.trim());
  const displayBubble = hasNote || showNotePrompt;

  return (
    <View style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      {resolved && !imgFailed ? (
        <Image
          source={{ uri: resolved }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: '#DCFCE7',
            borderWidth: 1.5,
            borderColor: '#BBF7D0',
          }}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <View
          style={[
            s.fallback,
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
          ]}
        >
          <Ionicons name="person" size={iconSize} color="#15803D" />
        </View>
      )}

      {/* Bong bóng Ghi chú kiểu Instagram Notes */}
      {displayBubble && (
        <View
          style={[
            s.noteContainer,
            noteAlign === 'right' ? { right: -2, alignItems: 'flex-end' } : { left: -4, alignItems: 'flex-start' },
          ]}
          pointerEvents="none"
        >
          <View style={s.noteCloud}>
            <Text
              style={[s.noteCloudText, !hasNote && s.notePromptText]}
              numberOfLines={2}
            >
              {hasNote ? noteText : 'Ghi chú...'}
            </Text>
          </View>
          <View
            style={[
              s.tailGroup,
              noteAlign === 'right' ? { paddingRight: Math.round(size * 0.26) } : { paddingLeft: Math.round(size * 0.26) },
            ]}
          >
            <View style={s.tailDotMedium} />
            <View style={s.tailDotSmall} />
          </View>
        </View>
      )}

      {showEditBadge && (
        <View style={s.editBadge}>
          <Ionicons name="pencil" size={10} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fallback: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteContainer: {
    position: 'absolute',
    bottom: '82%',
    zIndex: 25,
  },
  noteCloud: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 13,
    maxWidth: 128,
    minWidth: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  noteCloudText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 13.5,
  },
  notePromptText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  tailGroup: {
    alignItems: 'center',
    marginTop: -1,
  },
  tailDotMedium: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.8,
    borderColor: '#E5E7EB',
  },
  tailDotSmall: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    borderWidth: 0.6,
    borderColor: '#E5E7EB',
  },
  editBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#1E5338',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
});
