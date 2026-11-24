import { api } from '@/utils/api';
import { uploadMultipart } from '@/utils/upload';
import type { UserNote } from '@/types/auth';

export type AdminPingResponse = {
  ok: boolean;
  message: string;
  userId: string;
};

export type AdminFoodNutrition = {
  kcal: number;
  protein?: number;
  carb?: number;
  fat?: number;
  fiber?: number;
};

export type AdminFood = {
  _id: string;
  classId: string;
  aiClassId?: string;
  name: string;
  source?: 'system' | 'admin' | 'user';
  ingredients?: string;
  cookingMethod?: string;
  mealTime?: string;
  imageUrl?: string;
  nutritionPer100g: AdminFoodNutrition;
  servingSizes?: { label: string; grams: number; isDefault?: boolean }[];
  isActive?: boolean;
  createdAt?: string;
};

export type AdminFoodListResponse = {
  items: AdminFood[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminFoodInput = {
  name: string;
  aiClassId?: string;
  ingredients?: string;
  cookingMethod?: string;
  mealTime?: string;
  standardServingGrams?: number;
  nutritionPer100g: AdminFoodNutrition;
};

export type DeleteFoodResponse = {
  hidden?: boolean;
  deleted?: boolean;
  message: string;
};

export type AdminUserItem = {
  _id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  note?: UserNote;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
};

export type AdminUserListResponse = {
  items: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminUserDetail = AdminUserItem & {
  gender?: 'male' | 'female';
  birthYear?: number;
  activityLevel?: string;
  goal?: string;
  targets?: { kcal?: number; protein?: number; carb?: number; fat?: number };
  latestMetric: { heightCm?: number; weightKg?: number; recordedAt?: string } | null;
  stats: {
    mealCount: number;
    scanCount: number;
    lastActiveAt: string | null;
  };
  recentMeals?: {
    _id: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
    eatenAt: string;
    note: string;
    kcal: number;
  }[];
};

export type AdminStatsResponse = {
  range: 7 | 30;
  cached?: boolean;
  overview: {
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    totalMeals: number;
    totalScans: number;
    totalFeedbacks: number;
  };
  dailySeries: {
    date: string;
    newUsers: number;
    scans: number;
    meals: number;
  }[];
  topFoods: {
    classId: string;
    name: string;
    count: number;
  }[];
  aiQuality: {
    avgConfidence: number;
    correctionRate: number;
  };
  chatbot?: {
    totalQuestions: number;
    rangeQuestions: number;
    activeUsers: number;
  };
};

export type AdminServiceHealthItem = {
  status: 'online' | 'offline' | 'unconfigured';
  latencyMs: number | null;
  detail: string;
  foods?: number | null;
  device?: string | null;
  knowledgeCount?: number | null;
};

export type AdminServicesHealthResponse = {
  checkedAt: string;
  vision: AdminServiceHealthItem;
  chatbot: AdminServiceHealthItem;
};

export type AdminFeedbackItem = {
  _id: string;
  predictionId: string;
  predictedClass?: string;
  correctFoodId?: { _id: string; name: string; aiClassId?: string } | null;
  comment?: string;
  status: 'pending' | 'resolved';
  adminNote?: string;
  createdAt: string;
};

export type AdminFeedbackListResponse = {
  items: AdminFeedbackItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminPredictionTop3 = {
  classId: string;
  confidence: number;
  k?: number;
  grams?: number;
};

export type AdminPredictionItem = {
  _id: string;
  modelVersion?: string;
  bowlCount?: number;
  detected?: boolean;
  top3: AdminPredictionTop3[];
  inferenceMs?: number;
  status: 'pending' | 'confirmed' | 'discarded';
  isCorrected: boolean;
  correctedFood?: { _id: string; name: string; aiClassId?: string } | null;
  createdAt: string;
};

export type AdminPredictionDetail = AdminPredictionItem & {
  user?: { _id: string; fullName: string } | null;
};

export type AdminPredictionListResponse = {
  items: AdminPredictionItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type ExportJsonResponse = {
  format: 'json';
  meta: { totalRows: number; skippedCustomFood: number; truncated: boolean };
};

export type AdminAuditLogItem = {
  _id: string;
  action: string;
  targetType: 'Food' | 'User' | 'Feedback' | 'AiPrediction' | string;
  targetId: string;
  summary: string;
  createdAt: string;
  admin: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
};

export type AdminAuditLogListResponse = {
  items: AdminAuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const adminService = {
  ping: async (): Promise<AdminPingResponse> => {
    const res = await api.get<AdminPingResponse>('/admin/ping');
    return res.data;
  },

  getFoods: async (params: {
    search?: string;
    source?: string;
    hasAiClass?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminFoodListResponse> => {
    const res = await api.get<AdminFoodListResponse>('/admin/foods', { params });
    return res.data;
  },

  getFoodById: async (id: string): Promise<AdminFood> => {
    const res = await api.get<AdminFood>(`/admin/foods/${id}`);
    return res.data;
  },

  createFood: async (data: AdminFoodInput): Promise<AdminFood> => {
    const res = await api.post<AdminFood>('/admin/foods', data);
    return res.data;
  },

  updateFood: async (id: string, data: Partial<AdminFoodInput>): Promise<AdminFood> => {
    const res = await api.put<AdminFood>(`/admin/foods/${id}`, data);
    return res.data;
  },

  deleteFood: async (id: string): Promise<DeleteFoodResponse> => {
    const res = await api.delete<DeleteFoodResponse>(`/admin/foods/${id}`);
    return res.data;
  },

  restoreFood: async (id: string): Promise<{ restored: boolean; message: string; food: AdminFood }> => {
    const res = await api.patch<{ restored: boolean; message: string; food: AdminFood }>(
      `/admin/foods/${id}/restore`
    );
    return res.data;
  },

  uploadFoodImage: async (id: string, imageUri: string): Promise<AdminFood> => {
    return uploadMultipart<AdminFood>({
      endpoint: `/admin/foods/${id}/image`,
      fieldName: 'image',
      imageUri,
    });
  },

  getUsers: async (params: {
    search?: string;
    role?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminUserListResponse> => {
    const res = await api.get<AdminUserListResponse>('/admin/users', { params });
    return res.data;
  },

  getUserById: async (id: string): Promise<AdminUserDetail> => {
    const res = await api.get<AdminUserDetail>(`/admin/users/${id}`);
    return res.data;
  },

  updateUser: async (
    id: string,
    data: { isActive?: boolean; role?: 'user' | 'admin' }
  ): Promise<AdminUserItem> => {
    const res = await api.patch<AdminUserItem>(`/admin/users/${id}`, data);
    return res.data;
  },

  resetUserPassword: async (
    id: string,
    newPassword: string
  ): Promise<{ ok: boolean; message: string }> => {
    const res = await api.post<{ ok: boolean; message: string }>(
      `/admin/users/${id}/reset-password`,
      { newPassword }
    );
    return res.data;
  },

  getStats: async (range: 7 | 30, refresh = false): Promise<AdminStatsResponse> => {
    const res = await api.get<AdminStatsResponse>('/admin/stats', {
      params: { range, ...(refresh ? { refresh: '1' } : {}) },
    });
    return res.data;
  },

  getServicesHealth: async (): Promise<AdminServicesHealthResponse> => {
    const res = await api.get<AdminServicesHealthResponse>('/admin/services-health');
    return res.data;
  },

  getFeedbacks: async (params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminFeedbackListResponse> => {
    const res = await api.get<AdminFeedbackListResponse>('/admin/feedbacks', { params });
    return res.data;
  },

  getFeedbackById: async (id: string): Promise<AdminFeedbackItem> => {
    const res = await api.get<AdminFeedbackItem>(`/admin/feedbacks/${id}`);
    return res.data;
  },

  updateFeedback: async (
    id: string,
    data: { status?: 'pending' | 'resolved'; adminNote?: string }
  ): Promise<AdminFeedbackItem> => {
    const res = await api.patch<AdminFeedbackItem>(`/admin/feedbacks/${id}`, data);
    return res.data;
  },

  getPredictions: async (params: {
    from?: string;
    to?: string;
    maxConfidence?: string;
    predictedClass?: string;
    status?: string;
    correctedOnly?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminPredictionListResponse> => {
    const res = await api.get<AdminPredictionListResponse>('/admin/predictions', { params });
    return res.data;
  },

  getPredictionById: async (id: string): Promise<AdminPredictionDetail> => {
    const res = await api.get<AdminPredictionDetail>(`/admin/predictions/${id}`);
    return res.data;
  },

  exportPredictionsJson: async (params: { from?: string; to?: string; limit?: number }): Promise<ExportJsonResponse> => {
    const res = await api.get<ExportJsonResponse>('/admin/predictions/export', {
      params: { ...params, format: 'json', limit: params.limit ?? 1000 },
    });
    return res.data;
  },

  exportPredictionsCsv: async (params?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<{
    csv: string;
    meta: { totalRows: number; skippedCustomFood: number; truncated: boolean };
  }> => {
    const res = await api.get<string>('/admin/predictions/export', {
      params: { ...params, format: 'csv', limit: params?.limit ?? 5000 },
      responseType: 'text',
    });
    return {
      csv: typeof res.data === 'string' ? res.data : String(res.data ?? ''),
      meta: {
        totalRows: Number(res.headers['x-total-rows'] ?? 0),
        skippedCustomFood: Number(res.headers['x-skipped-custom-food'] ?? 0),
        truncated: res.headers['x-truncated'] === 'true',
      },
    };
  },

  getAuditLogs: async (params: {
    targetType?: string;
    action?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminAuditLogListResponse> => {
    const res = await api.get<AdminAuditLogListResponse>('/admin/audit-logs', { params });
    return res.data;
  },
};
