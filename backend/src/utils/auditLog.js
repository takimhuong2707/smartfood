import AuditLog from '../models/AuditLog.js';

export async function recordAuditLog({ adminId, action, targetType, targetId, summary }) {
  try {
    await AuditLog.create({
      adminId,
      action,
      targetType,
      targetId: String(targetId),
      summary,
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }
}
