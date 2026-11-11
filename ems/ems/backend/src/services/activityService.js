import ActivityLog from '../models/ActivityLog.js';

// Records who did what. Logging must never break the action itself, so errors are only printed.
export const logActivity = async (req, { action, entityType, entityId, description }) => {
  try {
    await ActivityLog.create({
      actor: req.user?._id,
      actorName: req.employee?.fullName || req.user?.email || 'System',
      actorRole: req.user?.role,
      action,
      entityType,
      entityId,
      description: String(description).slice(0, 300),
    });
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
};
