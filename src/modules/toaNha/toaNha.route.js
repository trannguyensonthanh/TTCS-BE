// src/modules/toaNha/toaNha.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { toaNhaController } from './toaNha.controller.js';
import { toaNhaValidation } from './toaNha.validation.js';

const router = express.Router();

// Apply authentication middleware to all routes in this module
router.use(authMiddleware.authenticateToken);

/**
 * GET /v1/toa-nha
 * Retrieves a list of buildings.
 * Roles allowed: ADMIN_HE_THONG, QUAN_LY_CSVC, CB_TO_CHUC_SU_KIEN
 * Query params validated by validateGetToaNhaParams
 * @returns {Object[]} List of buildings
 */
router.get(
  '/',
  authMiddleware.authorizeRoles(
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.QUAN_LY_CSVC,
    MaVaiTro.CB_TO_CHUC_SU_KIEN
  ),
  toaNhaValidation.validateGetToaNhaParams,
  asyncHandler(toaNhaController.getToaNhaListController)
);

/**
 * POST /v1/toa-nha
 * Creates a new building.
 * Role allowed: ADMIN_HE_THONG
 * Body validated by validateCreateToaNhaPayload
 * @body {Object} Building data
 * @returns {Object} Created building
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  toaNhaValidation.validateCreateToaNhaPayload,
  asyncHandler(toaNhaController.createToaNhaController)
);

/**
 * GET /v1/toa-nha/:id
 * Retrieves details of a specific building by ID.
 * Roles allowed: ADMIN_HE_THONG, QUAN_LY_CSVC, CB_TO_CHUC_SU_KIEN
 * @param {string} id - Building ID (validated)
 * @returns {Object} Building details
 */
router.get(
  '/:id',
  authMiddleware.authorizeRoles(
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.QUAN_LY_CSVC,
    MaVaiTro.CB_TO_CHUC_SU_KIEN
  ),
  toaNhaValidation.validateIdParam,
  asyncHandler(toaNhaController.getToaNhaDetailController)
);

/**
 * PUT /v1/toa-nha/:id
 * Updates a building by ID.
 * Role allowed: ADMIN_HE_THONG
 * @param {string} id - Building ID (validated)
 * @body {Object} Updated building data
 * @returns {Object} Updated building
 */
router.put(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  toaNhaValidation.validateIdParam,
  toaNhaValidation.validateUpdateToaNhaPayload,
  asyncHandler(toaNhaController.updateToaNhaController)
);

/**
 * DELETE /v1/toa-nha/:id
 * Deletes a building by ID.
 * Role allowed: ADMIN_HE_THONG
 * @param {string} id - Building ID (validated)
 * @returns {Object} Deletion result
 */
router.delete(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  toaNhaValidation.validateIdParam,
  asyncHandler(toaNhaController.deleteToaNhaController)
);

export default router;
