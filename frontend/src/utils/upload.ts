import { Platform } from 'react-native';
import { API_URL } from '@/constants';
import { tokenStorage } from './token';

type UploadOptions = {
  endpoint: string;
  fieldName?: string;
  imageUri?: string | null;
  mimeType?: string | null;
  isVideo?: boolean;
  extraFields?: Record<string, string | undefined>;
};

function resolveFileMeta(uri: string, explicitMime?: string | null, isVideo?: boolean) {
  const cleanPath = uri.split('?')[0];
  const extMatch = cleanPath.match(/\.(mp4|mov|webm|m4v|3gp|png|webp|jpeg|jpg)$/i);
  const rawExt = extMatch ? extMatch[1].toLowerCase() : isVideo ? 'mp4' : 'jpg';

  if (isVideo || ['mp4', 'mov', 'webm', 'm4v', '3gp'].includes(rawExt) || explicitMime?.startsWith('video/')) {
    const vExt = ['mp4', 'mov', 'webm', 'm4v', '3gp'].includes(rawExt) ? rawExt : 'mp4';
    const vMime =
      explicitMime && explicitMime.startsWith('video/')
        ? explicitMime
        : vExt === 'mov'
        ? 'video/quicktime'
        : vExt === 'webm'
        ? 'video/webm'
        : vExt === 'm4v'
        ? 'video/x-m4v'
        : vExt === '3gp'
        ? 'video/3gpp'
        : 'video/mp4';
    return { name: `upload.${vExt}`, mime: vMime };
  }

  const iExt = rawExt === 'png' ? 'png' : rawExt === 'webp' ? 'webp' : 'jpg';
  const iMime = iExt === 'png' ? 'image/png' : iExt === 'webp' ? 'image/webp' : 'image/jpeg';
  return { name: `upload.${iExt}`, mime: iMime };
}

export async function uploadMultipart<T>({
  endpoint,
  fieldName = 'image',
  imageUri,
  mimeType,
  isVideo = false,
  extraFields,
}: UploadOptions): Promise<T> {
  const token = await tokenStorage.get();
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (Platform.OS === 'web') {
    const formData = new FormData();
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) {
        if (v !== undefined) formData.append(k, v);
      }
    }
    if (imageUri) {
      const resBlob = await fetch(imageUri);
      const blob = await resBlob.blob();
      const meta = resolveFileMeta(imageUri, blob.type || mimeType, isVideo);
      formData.append(fieldName, blob, meta.name);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || `Lỗi tải lên (HTTP ${res.status})`);
    }
    return data as T;
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.onload = () => {
      let parsed: any = {};
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        parsed = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as T);
      } else {
        reject(new Error(parsed?.message || `Lỗi tải lên máy chủ (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Không kết nối được máy chủ khi tải tệp lên. Vui lòng kiểm tra mạng Wi-Fi.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Quá thời gian tải tệp lên máy chủ.'));
    };
    xhr.timeout = 120000;

    const formData = new FormData();
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) {
        if (v !== undefined) formData.append(k, v);
      }
    }

    if (imageUri) {
      const meta = resolveFileMeta(imageUri, mimeType, isVideo);
      formData.append(fieldName, {
        uri: imageUri,
        name: meta.name,
        type: meta.mime,
      } as any);
    }

    xhr.send(formData);
  });
}
