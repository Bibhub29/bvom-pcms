
import mongoose from 'mongoose';
import Chapter from '../models/Chapter.js';
import Course from '../models/Course.js';
import Draft from '../models/Draft.js';

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getCourse = async (organizationId, courseId, session = null) => {
    let query = Course.findOne({
        _id: courseId,
        organizationId
    }).select('_id');

    if (session) {
        query = query.session(session);
    }

    const course = await query;

    if (!course) {
        throw createError('Course not found in this organization', 404);
    }

    return course;
};

const getChapter = async (organizationId, id) => {
    const chapter = await Chapter.findOne({
        _id: id,
        organizationId
    });

    if (!chapter) {
        throw createError('Chapter not found', 404);
    }

    return chapter;
};

const listChapters = async (organizationId, query) => {
    const { courseId, status, search, page, pageSize } = query;
    const filter = { organizationId };

    if (courseId) {
        await getCourse(organizationId, courseId);
        filter.courseId = courseId;
    }

    if (status) {
        filter.status = status;
    }

    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');

        filter.name = pattern;
    }

    const [chapters, total] = await Promise.all([
        Chapter.find(filter)
            .sort({ courseId: 1, order: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        Chapter.countDocuments(filter)
    ]);

    return {
        data: chapters,
        meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        }
    };
};

const getChapterById = async (organizationId, id) => {
    return getChapter(organizationId, id);
};

const createChapter = async (organizationId, data) => {
    await getCourse(organizationId, data.courseId);

    const duplicateName = await Chapter.exists({
        organizationId,
        courseId: data.courseId,
        name: {
            $regex: `^${escapeRegex(data.name.trim())}$`,
            $options: 'i'
        }
    });

    if (duplicateName) {
        throw createError(
            'A chapter with this name already exists in this course',
            409
        );
    }

    const duplicateOrder = await Chapter.exists({
        organizationId,
        courseId: data.courseId,
        order: data.order
    });

    if (duplicateOrder) {
        throw createError(
            'This chapter order is already used in the course',
            409
        );
    }

    return Chapter.create({
        organizationId,
        courseId: data.courseId,
        name: data.name,
        content: data.content ?? '',
        chatLink: data.chatLink ?? '',
        order: data.order,
        status: data.status ?? 'Pending'
    });
};

const updateChapter = async (organizationId, id, data) => {
    const chapter = await getChapter(organizationId, id);
    const nextCourseId = data.courseId ?? chapter.courseId.toString();

    if (nextCourseId !== chapter.courseId.toString()) {
        await getCourse(organizationId, nextCourseId);
    }

    const nextName = data.name ?? chapter.name;
    const nextOrder = data.order ?? chapter.order;

    const duplicateName = await Chapter.exists({
        organizationId,
        courseId: nextCourseId,
        _id: { $ne: id },
        name: {
            $regex: `^${escapeRegex(nextName.trim())}$`,
            $options: 'i'
        }
    });

    if (duplicateName) {
        throw createError(
            'A chapter with this name already exists in this course',
            409
        );
    }

    const duplicateOrder = await Chapter.exists({
        organizationId,
        courseId: nextCourseId,
        _id: { $ne: id },
        order: nextOrder
    });

    if (duplicateOrder) {
        throw createError(
            'This chapter order is already used in the course',
            409
        );
    }

    if (data.courseId !== undefined) {
        chapter.courseId = data.courseId;
    }

    if (data.name !== undefined) {
        chapter.name = data.name;
    }

    if (data.content !== undefined) {
        chapter.content = data.content;
    }

    if (data.chatLink !== undefined) {
        chapter.chatLink = data.chatLink;
    }

    if (data.order !== undefined) {
        chapter.order = data.order;
    }

    if (data.status !== undefined) {
        chapter.status = data.status;
    }

    await chapter.save();

    return chapter;
};

const updateChapterStatus = async (organizationId, id, status) => {
    const chapter = await getChapter(organizationId, id);

    chapter.status = status;

    await chapter.save();

    return chapter;
};

const deleteChapter = async (organizationId, id) => {
    const chapter = await getChapter(organizationId, id);

    if (chapter.status === 'Published') {
        throw createError(
            'Published chapters cannot be deleted. Change the publication status according to your content policy first.',
            409
        );
    }

    const draftCount = await Draft.countDocuments({
        organizationId,
        chapterId: id,
        type: 'chapter'
    });

    if (draftCount > 0) {
        throw createError(
            'Cannot delete this chapter while chapter drafts are attached. Remove those drafts first.',
            409
        );
    }

    await chapter.deleteOne();

    return {
        id: chapter._id.toString(),
        deleted: true
    };
};

const reorderChapters = async (organizationId, courseId, items) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            await getCourse(organizationId, courseId, session);

            const chapters = await Chapter.find({
                organizationId,
                courseId
            })
                .select('_id order')
                .session(session);

            if (chapters.length !== items.length) {
                throw createError(
                    'Reorder request must include every chapter in this course',
                    400
                );
            }

            const existingIds = new Set(
                chapters.map((chapter) => chapter._id.toString())
            );

            if (items.some((item) => !existingIds.has(item.id))) {
                throw createError(
                    'One or more chapters do not belong to this course',
                    400
                );
            }

            const temporaryBase = Math.max(
                0,
                ...chapters.map((chapter) => chapter.order)
            ) + chapters.length + items.length + 1000;

            await Chapter.bulkWrite(
                items.map((item, index) => ({
                    updateOne: {
                        filter: {
                            _id: item.id,
                            organizationId,
                            courseId
                        },
                        update: {
                            $set: { order: temporaryBase + index }
                        }
                    }
                })),
                { session }
            );

            await Chapter.bulkWrite(
                items.map((item) => ({
                    updateOne: {
                        filter: {
                            _id: item.id,
                            organizationId,
                            courseId
                        },
                        update: {
                            $set: { order: item.order }
                        }
                    }
                })),
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    return { reordered: items.length };
};

const bulkImportChapters = async (organizationId, courseId, input) => {
    const session = await mongoose.startSession();
    let importedChapters = [];

    try {
        await session.withTransaction(async () => {
            await getCourse(organizationId, courseId, session);

            const incomingNames = input.chapters.map(
                (chapter) => chapter.name.trim().toLowerCase()
            );

            const incomingOrders = input.chapters.map(
                (chapter) => chapter.order
            );

            if (new Set(incomingNames).size !== incomingNames.length) {
                throw createError(
                    'Bulk import contains duplicate chapter names',
                    400
                );
            }

            if (new Set(incomingOrders).size !== incomingOrders.length) {
                throw createError(
                    'Bulk import contains duplicate chapter order values',
                    400
                );
            }

            const existingChapters = await Chapter.find({
                organizationId,
                courseId
            })
                .select('name order')
                .session(session)
                .lean();

            const existingNames = new Set(
                existingChapters.map(
                    (chapter) => chapter.name.trim().toLowerCase()
                )
            );

            const existingOrders = new Set(
                existingChapters.map((chapter) => chapter.order)
            );

            const duplicateNames = input.chapters
                .filter((chapter) => existingNames.has(
                    chapter.name.trim().toLowerCase()
                ))
                .map((chapter) => chapter.name);

            const duplicateOrders = input.chapters
                .filter((chapter) => existingOrders.has(chapter.order))
                .map((chapter) => chapter.order);

            if (duplicateNames.length > 0 || duplicateOrders.length > 0) {
                const error = createError(
                    'Bulk import conflicts with existing chapters',
                    409
                );

                error.details = {
                    duplicateNames,
                    duplicateOrders
                };

                throw error;
            }

            const documents = input.chapters.map((chapter) => ({
                organizationId,
                courseId,
                name: chapter.name,
                content: chapter.content ?? '',
                chatLink: chapter.chatLink ?? '',
                order: chapter.order,
                status: chapter.status ?? 'Pending'
            }));

            importedChapters = await Chapter.insertMany(documents, {
                session,
                ordered: true
            });
        });
    } finally {
        await session.endSession();
    }

    return {
        importedCount: importedChapters.length,
        chapters: importedChapters
    };
};

export {
    listChapters,
    getChapterById,
    createChapter,
    updateChapter,
    updateChapterStatus,
    deleteChapter,
    reorderChapters,
    bulkImportChapters
};
