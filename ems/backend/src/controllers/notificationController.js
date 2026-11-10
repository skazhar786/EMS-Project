import Notification from '../models/Notification.js';
import Announcement from '../models/Announcement.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notifyUsers } from '../services/notificationService.js';

// ---------------------------------------------------- own notifications
// Every query is scoped to req.user._id: a user can never read or change someone else's.

// GET /api/notifications?page&limit&unread=true
export const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 50);
  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data,
    unreadCount,
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// GET /api/notifications/unread-count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.json({ success: true, data: { count } });
});

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  res.json({ success: true, data: notification });
});

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, message: 'All notifications marked as read', data: { updated: result.modifiedCount } });
});

// ------------------------------------------------------- announcements

// GET /api/announcements
export const listAnnouncements = asyncHandler(async (req, res) => {
  const data = await Announcement.find()
    .populate('department', 'name')
    .populate('createdBy', 'email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ success: true, data });
});

// POST /api/announcements   (title, message, optional department)
export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, department } = req.body;

  if (department && !(await Department.exists({ _id: department }))) {
    throw ApiError.badRequest('Selected department does not exist');
  }

  const recipients = await Employee.find({ status: 'Active', ...(department ? { department } : {}) })
    .select('user')
    .lean();
  if (recipients.length === 0) {
    throw ApiError.badRequest(department ? 'There are no active employees in that department' : 'There are no active employees to notify');
  }

  const announcement = await Announcement.create({
    title, message, createdBy: req.user._id, department: department || null, recipientCount: recipients.length,
  });

  await notifyUsers(
    recipients.map((r) => r.user),
    { type: 'ANNOUNCEMENT', title, message, link: '/employee/notifications', announcement: announcement._id }
  );

  await announcement.populate('department', 'name');
  res.status(201).json({
    success: true,
    message: `Announcement sent to ${recipients.length} employee${recipients.length > 1 ? 's' : ''}`,
    data: announcement,
  });
});

// DELETE /api/announcements/:id   (also retracts it from employees' notification lists)
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');
  await Notification.deleteMany({ announcement: announcement._id });
  await announcement.deleteOne();
  res.json({ success: true, message: 'Announcement deleted' });
});
