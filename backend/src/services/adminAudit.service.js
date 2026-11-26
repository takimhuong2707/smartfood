import AuditLog from '../models/AuditLog.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VALID_TARGET_TYPES = new Set(['Food', 'User', 'Feedback', 'AiPrediction']);

export async function listAuditLogs({
  targetType = '',
  action = '',
  search = '',
  page = 1,
  limit = 20,
}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const filter = {};

  if (typeof targetType === 'string' && VALID_TARGET_TYPES.has(targetType)) {
    filter.targetType = targetType;
  }

  if (typeof action === 'string' && /^[A-Z_]{2,40}$/.test(action.trim())) {
    filter.action = action.trim();
  }

  if (typeof search === 'string' && search.trim()) {
    const rx = escapeRegex(search.trim());
    filter.$or = [
      { summary: { $regex: rx, $options: 'i' } },
      { action: { $regex: rx, $options: 'i' } },
      { targetId: { $regex: rx, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate('adminId', 'fullName email')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items: items.map((log) => ({
      _id: log._id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      summary: log.summary || '',
      createdAt: log.createdAt,
      admin: log.adminId
        ? {
            _id: log.adminId._id,
            fullName: log.adminId.fullName,
            email: log.adminId.email,
          }
        : null,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}
