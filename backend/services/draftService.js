import mongoose from 'mongoose';
import Draft from '../models/Draft.js';
import Section from '../models/Section.js';
import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';

const serviceError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const parentConfig = {
    section: { Model: Section, field: 'sectionId' },
    course: { Model: Course, field: 'courseId' },
    chapter: { Model: Chapter, field: 'chapterId' }
};

const verifyParent = async (organizationId, type, parentId) => {
    const config = parentConfig[type];
    if (!config) throw serviceError('Unsupported draft type');
    const parent = await config.Model.findOne({ _id: parentId, organizationId }).select('_id');
    if (!parent) throw serviceError(`${type[0].toUpperCase()}${type.slice(1)} not found`, 404);
    return config;
};

const listDrafts = async (organizationId, filters) => {
    const { page, pageSize, search, ...fields } = filters;
    const query = { organizationId };
    for (const key of ['type', 'sectionId', 'courseId', 'chapterId', 'status']) {
        if (fields[key]) query[key] = fields[key];
    }
    if (search) query.draftName = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const [drafts, total] = await Promise.all([
        Draft.find(query).sort({ draftOrder: 1, createdAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        Draft.countDocuments(query)
    ]);
    return { drafts, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};

const listParentDrafts = async (organizationId, type, parentId, filters) => {
    const config = await verifyParent(organizationId, type, parentId);
    const query = { organizationId, type, [config.field]: parentId };
    if (filters.status) query.status = filters.status;
    if (filters.search) query.draftName = { $regex: filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const [drafts, total] = await Promise.all([
        Draft.find(query).sort({ draftOrder: 1, createdAt: 1 }).skip((filters.page - 1) * filters.pageSize).limit(filters.pageSize).lean(),
        Draft.countDocuments(query)
    ]);
    return { drafts, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
};

const getDraftById = async (organizationId, id) => {
    const draft = await Draft.findOne({ _id: id, organizationId });
    if (!draft) throw serviceError('Draft not found', 404);
    return draft;
};

const nextOrder = async (organizationId, type, parentField, parentId) => {
    const last = await Draft.findOne({ organizationId, type, [parentField]: parentId }).sort({ draftOrder: -1 }).select('draftOrder').lean();
    return last ? last.draftOrder + 1 : 1;
};

const createForParent = async (organizationId, type, parentId, body) => {
    const config = await verifyParent(organizationId, type, parentId);
    const draftOrder = body.draftOrder ?? await nextOrder(organizationId, type, config.field, parentId);
    return Draft.create({
        organizationId, type, [config.field]: parentId,
        draftName: body.draftName ?? body.name,
        draftOrder,
        content: body.content ?? '',
        commonDraft: body.commonDraft ?? '',
        customDraft: body.customDraft ?? '',
        status: body.status ?? 'pending'
    });
};

const createDraft = async (organizationId, body) => {
    const config = await verifyParent(organizationId, body.type, body[`${body.type}Id`]);
    return createForParent(organizationId, body.type, body[config.field], body);
};

const createParentDraft = createForParent;

const updateDraft = async (organizationId, id, fields) => {
    const draft = await getDraftById(organizationId, id);
    for (const field of ['draftName', 'draftOrder', 'content', 'commonDraft', 'customDraft']) {
        if (fields[field] !== undefined) draft[field] = fields[field];
    }
    await draft.save();
    return draft;
};

const updateDraftStatus = async (organizationId, id, status) => {
    const draft = await getDraftById(organizationId, id);
    draft.status = status;
    await draft.save();
    return draft;
};

const deleteDraft = async (organizationId, id) => {
    const draft = await getDraftById(organizationId, id);
    await draft.deleteOne();
    return { id: draft._id.toString(), deleted: true };
};

const reorderDrafts = async (organizationId, body) => {
    const config = await verifyParent(organizationId, body.type, body.parentId);
    const drafts = await Draft.find({ organizationId, type: body.type, [config.field]: body.parentId }).select('_id').lean();
    if (drafts.length !== body.items.length) throw serviceError('Reorder must include every draft for this parent', 400);
    const ids = new Set(drafts.map(draft => String(draft._id)));
    if (body.items.some(item => !ids.has(item.id))) throw serviceError('One or more drafts do not belong to this parent', 404);
    await Draft.bulkWrite(body.items.map(item => ({ updateOne: { filter: { _id: item.id, organizationId, [config.field]: body.parentId }, update: { $set: { draftOrder: item.order } } } })));
    return listParentDrafts(organizationId, body.type, body.parentId, { page: 1, pageSize: 1000, search: '' }).then(result => result.drafts);
};

const bulkImportCourseDrafts = async (organizationId, courseId, drafts) => {
    await verifyParent(organizationId, 'course', courseId);
    const existingCount = await Draft.countDocuments({ organizationId, type: 'course', courseId });
    const records = drafts.map((draft, index) => ({
        organizationId, type: 'course', courseId,
        draftName: draft.draftName,
        draftOrder: draft.draftOrder ?? existingCount + index + 1,
        commonDraft: draft.commonDraft ?? '', customDraft: draft.customDraft ?? '', status: draft.status ?? 'pending'
    }));
    return Draft.insertMany(records);
};

export { listDrafts, listParentDrafts, getDraftById, createDraft, createParentDraft, updateDraft, updateDraftStatus, deleteDraft, reorderDrafts, bulkImportCourseDrafts };
