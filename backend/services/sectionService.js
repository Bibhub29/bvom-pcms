
import mongoose from 'mongoose';
import Section from '../models/Section.js';
import Course from '../models/Course.js';
import Draft from '../models/Draft.js';
import Chapter from '../models/Chapter.js';
import CourseProgress from '../models/CourseProgress.js';

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getSection = async (organizationId, id) => {
    const section = await Section.findOne({
        _id: id,
        organizationId
    });

    if (!section) {
        throw createError('Section not found', 404);
    }

    return section;
};

const listSections = async (organizationId, query) => {
    const { page, pageSize, search } = query;
    const filter = { organizationId };

    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        filter.$or = [
            { name: pattern },
            { description: pattern }
        ];
    }

    const [sections, total] = await Promise.all([
        Section.find(filter)
            .sort({ order: 1, name: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        Section.countDocuments(filter)
    ]);

    return {
        data: sections,
        meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        }
    };
};

const createSection = async (organizationId, data) => {
    const nameKey = data.name.trim().toLowerCase();

    const duplicate = await Section.exists({
        organizationId,
        nameKey
    });

    if (duplicate) {
        throw createError('A section with this name already exists', 409);
    }

    let order = data.order;

    if (order === undefined) {
        const lastSection = await Section.findOne({ organizationId })
            .sort({ order: -1 })
            .select('order')
            .lean();

        order = lastSection ? lastSection.order + 1 : 0;
    }

    const section = await Section.create({
        organizationId,
        name: data.name,
        description: data.description ?? '',
        order
    });

    return section;
};

const updateSection = async (organizationId, id, data) => {
    const section = await getSection(organizationId, id);

    if (data.name !== undefined) {
        const duplicate = await Section.exists({
            organizationId,
            nameKey: data.name.trim().toLowerCase(),
            _id: { $ne: id }
        });

        if (duplicate) {
            throw createError('A section with this name already exists', 409);
        }

        section.name = data.name;
    }

    if (data.description !== undefined) {
        section.description = data.description;
    }

    if (data.status !== undefined) {
        section.status = data.status;
    }

    if (data.order !== undefined) {
        section.order = data.order;
    }

    await section.save();

    return section;
};

const deleteSection = async (organizationId, id) => {
    const section = await getSection(organizationId, id);
    const courses = await Course.find({ organizationId, sectionId: id }).select('_id').lean();
    const courseIds = courses.map((course) => course._id);
    const chapters = courseIds.length
        ? await Chapter.find({ organizationId, courseId: { $in: courseIds } }).select('_id').lean()
        : [];
    const chapterIds = chapters.map((chapter) => chapter._id);

    await Draft.deleteMany({
        organizationId,
        $or: [
            { type: 'section', sectionId: id },
            ...(courseIds.length ? [{ type: 'course', courseId: { $in: courseIds } }] : []),
            ...(chapterIds.length ? [{ type: 'chapter', chapterId: { $in: chapterIds } }] : [])
        ]
    });
    if (courseIds.length) {
        await CourseProgress.deleteMany({ organizationId, courseId: { $in: courseIds } });
        await Chapter.deleteMany({ organizationId, courseId: { $in: courseIds } });
        await Course.deleteMany({ organizationId, _id: { $in: courseIds } });
    }
    await section.deleteOne();

    return {
        id: section._id.toString(),
        deleted: true,
        deletedCourses: courseIds.length,
        deletedChapters: chapterIds.length
    };
};

const reorderSections = async (organizationId, items) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const sections = await Section.find({ organizationId })
                .select('_id')
                .session(session);

            if (sections.length !== items.length) {
                throw createError(
                    'Reorder request must include every section in this organization',
                    400
                );
            }

            const existingIds = new Set(
                sections.map((section) => section._id.toString())
            );

            if (items.some((item) => !existingIds.has(item.id))) {
                throw createError(
                    'One or more sections do not exist in this organization',
                    404
                );
            }

            const operations = items.map((item) => ({
                updateOne: {
                    filter: {
                        _id: item.id,
                        organizationId
                    },
                    update: {
                        $set: { order: item.order }
                    }
                }
            }));

            await Section.bulkWrite(operations, { session });
        });
    } finally {
        await session.endSession();
    }

    return { reordered: items.length };
};

export {
    listSections,
    getSection,
    createSection,
    updateSection,
    deleteSection,
    reorderSections
};
