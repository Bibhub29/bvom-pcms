import { successResponse } from '../utils/apiResponse.js';
import * as sections from '../services/sectionService.js';

const listSections = async (req, res) => {
    const result = await sections.listSections(req.user.organizationId, req.validatedQuery);
    return successResponse(res, { message: 'Sections retrieved successfully', data: result.data, meta: result.meta });
};
const getSection = async (req, res) => successResponse(res, { message: 'Section retrieved successfully', data: await sections.getSection(req.user.organizationId, req.params.id) });
const createSection = async (req, res) => successResponse(res, { statusCode: 201, message: 'Section created successfully', data: await sections.createSection(req.user.organizationId, req.body) });
const updateSection = async (req, res) => successResponse(res, { message: 'Section updated successfully', data: await sections.updateSection(req.user.organizationId, req.params.id, req.body) });
const deleteSection = async (req, res) => successResponse(res, { message: 'Section deleted successfully', data: await sections.deleteSection(req.user.organizationId, req.params.id) });
const reorderSections = async (req, res) => successResponse(res, { message: 'Sections reordered successfully', data: await sections.reorderSections(req.user.organizationId, req.body.items) });

export { listSections, getSection, createSection, updateSection, deleteSection, reorderSections };
