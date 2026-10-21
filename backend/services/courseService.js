
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Section from '../models/Section.js';
import Chapter from '../models/Chapter.js';
import Draft from '../models/Draft.js';

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getCourse = async (organizationId, id) => {
    const course = await Course.findOne({
        _id: id,
        organizationId
    });

    if (!course) {
        throw createError('Course not found', 404);
    }

    return course;
};

const getSectionForOrganization = async (organizationId, sectionId) => {
    const section = await Section.findOne({
        _id: sectionId,
        organizationId
    }).select('_id');

    if (!section) {
        throw createError('Section not found in this organization', 404);
    }

    return section;
};

const listCourses = async (organizationId, query) => {
    const { sectionId, page, pageSize, search } = query;
    const filter = { organizationId };

    if (sectionId) {
        await getSectionForOrganization(organizationId, sectionId);
        filter.sectionId = sectionId;
    }

    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');

        filter.$or = [
            { name: pattern },
            { description: pattern }
        ];
    }

    const [courses, total] = await Promise.all([
        Course.find(filter)
            .sort({ order: 1, name: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        Course.countDocuments(filter)
    ]);

    return {
        data: courses,
        meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        }
    };
};

const createCourse = async (organizationId, data) => {
    await getSectionForOrganization(organizationId, data.sectionId);

    const nameKey = data.name.trim().toLowerCase();

    const duplicate = await Course.exists({
        organizationId,
        sectionId: data.sectionId,
        nameKey
    });

    if (duplicate) {
        throw createError(
            'A course with this name already exists in this section',
            409
        );
    }

    let order = data.order;

    if (order === undefined) {
        const lastCourse = await Course.findOne({
            organizationId,
            sectionId: data.sectionId
        })
            .sort({ order: -1 })
            .select('order')
            .lean();

        order = lastCourse ? lastCourse.order + 1 : 0;
    }

    const course = await Course.create({
        organizationId,
        sectionId: data.sectionId,
        name: data.name,
        description: data.description ?? '',
        iconUrl: data.iconUrl ?? '',
        commonDraft: data.commonDraft ?? '',
        status: data.status ?? 'pending',
        order
    });

    return course;
};

const updateCourse = async (organizationId, id, data) => {
    const course = await getCourse(organizationId, id);

    const nextSectionId = data.sectionId ?? course.sectionId.toString();
    const sectionChanged = nextSectionId !== course.sectionId.toString();

    if (sectionChanged) {
        await getSectionForOrganization(organizationId, nextSectionId);
    }

    const nextName = data.name ?? course.name;
    const duplicate = await Course.exists({
        organizationId,
        sectionId: nextSectionId,
        nameKey: nextName.trim().toLowerCase(),
        _id: { $ne: id }
    });

    if (duplicate) {
        throw createError(
            'A course with this name already exists in this section',
            409
        );
    }

    if (data.name !== undefined) {
        course.name = data.name;
    }

    if (data.description !== undefined) {
        course.description = data.description;
    }

    if (data.iconUrl !== undefined) {
        course.iconUrl = data.iconUrl;
    }

    if (data.commonDraft !== undefined) {
        course.commonDraft = data.commonDraft;
    }

    if (data.status !== undefined) {
        course.status = data.status;
    }

    if (sectionChanged) {
        course.sectionId = nextSectionId;

        if (data.order === undefined) {
            const lastCourse = await Course.findOne({
                organizationId,
                sectionId: nextSectionId
            })
                .sort({ order: -1 })
                .select('order')
                .lean();

            course.order = lastCourse ? lastCourse.order + 1 : 0;
        }
    }

    if (data.order !== undefined) {
        course.order = data.order;
    }

    await course.save();

    return course;
};

const deleteCourse = async (organizationId, id) => {
    const course = await getCourse(organizationId, id);

    const [chapterCount, draftCount] = await Promise.all([
        Chapter.countDocuments({
            organizationId,
            courseId: id
        }),
        Draft.countDocuments({
            organizationId,
            courseId: id
        })
    ]);

    if (chapterCount > 0 || draftCount > 0) {
        throw createError(
            'Cannot delete this course while chapters or course drafts are attached. Remove those records first.',
            409
        );
    }

    await course.deleteOne();

    return { id: course._id.toString(), deleted: true };
};

const reorderCourses = async (organizationId, sectionId, items) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const section = await Section.findOne({
                _id: sectionId,
                organizationId
            })
                .select('_id')
                .session(session);

            if (!section) {
                throw createError('Section not found', 404);
            }

            const courses = await Course.find({
                organizationId,
                sectionId
            })
                .select('_id')
                .session(session);

            if (courses.length !== items.length) {
                throw createError(
                    'Reorder request must include every course in this section',
                    400
                );
            }

            const existingIds = new Set(
                courses.map((course) => course._id.toString())
            );

            if (items.some((item) => !existingIds.has(item.id))) {
                throw createError(
                    'One or more courses do not belong to this section',
                    400
                );
            }

            const operations = items.map((item) => ({
                updateOne: {
                    filter: {
                        _id: item.id,
                        organizationId,
                        sectionId
                    },
                    update: {
                        $set: { order: item.order }
                    }
                }
            }));

            await Course.bulkWrite(operations, { session });
        });
    } finally {
        await session.endSession();
    }

    return { reordered: items.length };
};

export {
    listCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    reorderCourses
};
