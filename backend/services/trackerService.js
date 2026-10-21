import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import CourseProgress from '../models/CourseProgress.js';

const fail = (message, statusCode = 404) => Object.assign(new Error(message), { statusCode });

const listTasks = async (organizationId, userId, filters) => {
    const query = { organizationId, userId };
    if (filters.priority) query.priority = filters.priority;
    if (filters.status) query.isCompleted = filters.status === 'completed';
    const [tasks, total] = await Promise.all([
        Task.find(query).sort({ createdAt: -1 }).skip((filters.page - 1) * filters.pageSize).limit(filters.pageSize).lean(),
        Task.countDocuments(query)
    ]);
    return { tasks, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
};

const createTask = (organizationId, userId, body) => Task.create({
    organizationId, userId, title: body.title, description: body.description ?? '',
    priority: body.priority ?? 'medium', dueDate: body.dueDate ?? null,
    isCompleted: body.isCompleted ?? false, completedAt: body.isCompleted ? new Date() : null
});

const ownedTask = async (organizationId, userId, id) => {
    const task = await Task.findOne({ _id: id, organizationId, userId });
    if (!task) throw fail('Task not found');
    return task;
};
const updateTask = async (organizationId, userId, id, fields) => {
    const task = await ownedTask(organizationId, userId, id);
    Object.assign(task, fields);
    if (fields.isCompleted !== undefined) task.completedAt = fields.isCompleted ? task.completedAt || new Date() : null;
    return task.save();
};
const updateTaskCompletion = (organizationId, userId, id, isCompleted) => updateTask(organizationId, userId, id, { isCompleted });
const deleteTask = async (organizationId, userId, id) => {
    const task = await ownedTask(organizationId, userId, id);
    await task.deleteOne();
    return { id: task._id.toString(), deleted: true };
};

const courseForOrg = async (organizationId, courseId) => {
    const course = await Course.findOne({ _id: courseId, organizationId }).lean();
    if (!course) throw fail('Course not found');
    return course;
};
const progressFor = async (organizationId, userId, courseId) => {
    const [totalChapters, progress] = await Promise.all([
        Chapter.countDocuments({ organizationId, courseId }),
        CourseProgress.findOne({ organizationId, userId, courseId }).lean()
    ]);
    const completedChapterIds = (progress?.completedChapterIds ?? []).map(String);
    const completedChapters = Math.min(totalChapters, completedChapterIds.length);
    return { courseId: String(courseId), totalChapters, completedChapters, progressPercentage: totalChapters ? Math.round(completedChapters * 100 / totalChapters) : 0, completedChapterIds };
};
const getCourseProgress = async (organizationId, userId, courseId) => {
    await courseForOrg(organizationId, courseId);
    return progressFor(organizationId, userId, courseId);
};
const listTrackedCourses = async (organizationId, userId) => {
    const courses = await Course.find({ organizationId }).sort({ order: 1 }).lean();
    const progress = await CourseProgress.find({ organizationId, userId }).lean();
    const progressMap = new Map(progress.map(record => [String(record.courseId), record.completedChapterIds.map(String)]));
    const counts = await Chapter.aggregate([{ $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } }, { $group: { _id: '$courseId', total: { $sum: 1 } } }]);
    const countMap = new Map(counts.map(record => [String(record._id), record.total]));
    return courses.map(course => {
        const totalChapters = countMap.get(String(course._id)) ?? 0;
        const completedChapters = Math.min(totalChapters, (progressMap.get(String(course._id)) ?? []).length);
        return { course, progress: { totalChapters, completedChapters, progressPercentage: totalChapters ? Math.round(completedChapters * 100 / totalChapters) : 0 } };
    });
};
const updateCourseProgress = async (organizationId, userId, courseId, completedChapterIds) => {
    await courseForOrg(organizationId, courseId);
    const chapters = await Chapter.find({ organizationId, courseId, _id: { $in: completedChapterIds } }).select('_id').lean();
    if (chapters.length !== completedChapterIds.length) throw fail('A chapter does not belong to this course', 400);
    await CourseProgress.findOneAndUpdate({ organizationId, userId, courseId }, { $set: { completedChapterIds: chapters.map(chapter => chapter._id) } }, { upsert: true, new: true, runValidators: true });
    return progressFor(organizationId, userId, courseId);
};
const getTrackerSummary = async (organizationId, userId) => {
    const [total, completed, courses, chapters, activity] = await Promise.all([
        Task.countDocuments({ organizationId, userId }), Task.countDocuments({ organizationId, userId, isCompleted: true }),
        Course.countDocuments({ organizationId }), Chapter.countDocuments({ organizationId }),
        Activity.findOne({ organizationId, userId, date: new Date().toISOString().slice(0, 10) }).lean()
    ]);
    return { tasks: { total, completed, pending: total - completed }, courses: { total: courses }, chapters: { total: chapters }, today: activity ?? null, taskCompletionPercentage: total ? Math.round(completed * 100 / total) : 0 };
};
const listActivity = (organizationId, userId, filters) => {
    const start = new Date(Date.UTC(filters.year, filters.month ? filters.month - 1 : 0, 1)).toISOString().slice(0, 10);
    const end = filters.month ? new Date(Date.UTC(filters.year, filters.month, 1)).toISOString().slice(0, 10) : `${filters.year + 1}-01-01`;
    return Activity.find({ organizationId, userId, date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean();
};
const upsertActivity = (organizationId, userId, date, body) => Activity.findOneAndUpdate(
    { organizationId, userId, date }, { $set: { ...body, note: body.note ?? '' } }, { new: true, upsert: true, runValidators: true }
);
const getAttendance = async (organizationId, userId, months) => {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1)).toISOString().slice(0, 10);
    const rows = await Activity.find({ organizationId, userId, date: { $gte: from, $lte: now.toISOString().slice(0, 10) } }).lean();
    const presentDays = rows.filter(row => row.attended).length;
    return { months, recordedDays: rows.length, presentDays, absentDays: rows.length - presentDays, attendancePercentage: rows.length ? Math.round(presentDays * 100 / rows.length) : 0 };
};

export { listTasks, createTask, updateTask, updateTaskCompletion, deleteTask, getCourseProgress, listTrackedCourses, updateCourseProgress, getTrackerSummary, listActivity, upsertActivity, getAttendance };
