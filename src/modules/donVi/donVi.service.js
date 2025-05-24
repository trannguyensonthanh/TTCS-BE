// src/modules/donVi/donVi.service.js
import { transformKeysPascalToCamel } from '../../utils/pascal_camel.util.js';
import { donViRepository } from './donVi.repository.js';

const getDonVis = async (params) => {
  const { items, totalItems } =
    await donViRepository.getAllDonViWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: transformKeysPascalToCamel(items),
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

export const donViService = {
  getDonVis,
};
