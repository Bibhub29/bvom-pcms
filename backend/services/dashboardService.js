import mongoose from 'mongoose';

import Section from '../models/Section.js';
import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import Draft from '../models/Draft.js';
import Notice from '../models/Notice.js';
import CourseProgress from '../models/CourseProgress.js';

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getDashboardSummary = async (organizationId, userId) => {
    const [
        sections,
        courses,
        chapters,
        drafts,
        totalTasks,
        completedTasks,
        pendingTasks,
        todayActivity,
        progressRecords
    ] = await Promise.all([
        Section.countDocuments({ organizationId }),
        Course.countDocuments({ organizationId }),
        Chapter.countDocuments({ organizationId }),
        Draft.countDocuments({ organizationId }),
        Task.countDocuments({ organizationId, userId }),
        Task.countDocuments({
            organizationId,
            userId,
            isCompleted: true
        }),
        Task.countDocuments({
            organizationId,
            userId,
            isCompleted: false
        }),
        Activity.findOne({
            organizationId,
            userId,
            date: new Date().toISOString().slice(0, 10)
        }),
        CourseProgress.find({ organizationId, userId })
    ]);

    const totalCompletedChapters = progressRecords.reduce(
        (total, item) => total + item.completedChapterIds.length,
        0
    );

    return {
        content: {
            sections,
            courses,
            chapters,
            drafts
        },
        tasks: {
            total: totalTasks,
            completed: completedTasks,
            pending: pendingTasks,
            completionPercentage: totalTasks === 0
                ? 0
                : Math.round((completedTasks / totalTasks) * 100)
        },
        progress: {
            completedChapters: Math.min(
                totalCompletedChapters,
                chapters
            ),
            totalChapters: chapters
        },
        today: {
            minutesSpent: todayActivity?.minutesSpent ?? 0,
            tasksCompleted: todayActivity?.tasksCompleted ?? 0,
            chaptersCompleted: todayActivity?.chaptersCompleted ?? 0,
            attended: todayActivity?.attended ?? false
        }
    };
};

const getDashboardSections = async (
    organizationId,
    filters
) => {
    const page = filters.page;
    const pageSize = filters.pageSize;

    const query = { organizationId };

    if (filters.search) {
        query.name = {
            $regex: escapeRegex(filters.search),
            $options: 'i'
        };
    }

    const [sections, total] = await Promise.all([
        Section.find(query)
            .sort({ order: 1, name: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        Section.countDocuments(query)
    ]);

    const sectionIds = sections.map((section) => section._id);

    const courses = await Course.find({
        organizationId,
        sectionId: { $in: sectionIds }
    })
        .sort({ order: 1, name: 1 })
        .select('_id sectionId name description iconUrl order')
        .lean();

    const coursesBySection = new Map();

    for (const course of courses) {
        const key = String(course.sectionId);

        if (!coursesBySection.has(key)) {
            coursesBySection.set(key, []);
        }

        coursesBySection.get(key).push(course);
    }

    return {
        sections: sections.map((section) => ({
            ...section,
            courses: coursesBySection.get(String(section._id)) || []
        })),
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        }
    };
};

const listNotices = async (organizationId, userId) => {
    return Notice.find({
        organizationId,
        isActive: true,
        dismissedBy: { $ne: new mongoose.Types.ObjectId(userId) },
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
};

const createNotice = async (organizationId, body) => Notice.create({
    organizationId,
    title: body.title,
    message: body.message,
    type: body.type ?? 'info'
});

const dismissNotice = async (organizationId, userId, id) => {
    const notice = await Notice.findOneAndUpdate(
        {
            _id: id,
            organizationId,
            isActive: true
        },
        {
            $addToSet: {
                dismissedBy: userId
            }
        },
        {
            new: true
        }
    );

    if (!notice) {
        const error = new Error('Notice not found');
        error.statusCode = 404;
        throw error;
    }

    return {
        id: notice._id,
        dismissed: true
    };
};

export {
    getDashboardSummary,
    getDashboardSections,
    listNotices,
    createNotice,
    dismissNotice
};
