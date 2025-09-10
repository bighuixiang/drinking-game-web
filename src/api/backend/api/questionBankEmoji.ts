// @ts-ignore
/* eslint-disable */

/**
 * 该文件为 @umijs/openapi 插件自动生成，请勿随意修改。如需修改请通过配置 openapi.config.ts 进行定制化。
 * */

import { request, type RequestOptions } from '@/utils/request';

/** 题目列表（支持分页） GET /api/admin/question-bank */
export async function qbankList(
  // 动态表格会传入 page/pageSize/field/order 等参数，这里做一次适配
  params: any = {},
  options?: RequestOptions,
) {
  const { page = 1, pageSize = 10, difficulty, isActive, ...rest } = params || {};
  const query: Record<string, any> = {
    type: 'emoji',
    page: Number(page) ,
    pageSize: Number(pageSize),
    ...rest,
  };
  if (typeof difficulty !== 'undefined' && difficulty !== null && difficulty !== '') query.difficulty = difficulty;
  if (typeof isActive !== 'undefined' && isActive !== null && isActive !== '') query.isActive = isActive;

  return request<{
    items?: any[];
    meta?: {
      itemCount?: number;
      totalItems?: number;
      itemsPerPage?: number;
      totalPages?: number;
      currentPage?: number;
    };
  }>('/api/admin/question-bank', {
    method: 'GET',
    params: query,
    ...(options || {}),
  });
}

/** 创建题目（emoji 可带答案） POST /api/admin/question-bank */
export async function qbankCreate(body: any, options?: RequestOptions) {
  return request<any>('/api/admin/question-bank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || { successMsg: '创建成功' }),
  });
}

/** 题目详情 GET /api/admin/question-bank/${param0} */
export async function qbankInfo(
  params: { id: number | string },
  options?: RequestOptions,
) {
  const { id: param0, ...queryParams } = params;
  return request<any>(`/api/admin/question-bank/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 更新题目 PUT /api/admin/question-bank/${param0} */
export async function qbankUpdate(
  params: { id: number | string },
  body: any,
  options?: RequestOptions,
) {
  const { id: param0, ...queryParams } = params;
  return request<any>(`/api/admin/question-bank/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...queryParams },
    data: body,
    ...(options || { successMsg: '更新成功' }),
  });
}

/** 删除题目 DELETE /api/admin/question-bank/${param0} */
export async function qbankDelete(
  params: { id: number | string },
  options?: RequestOptions,
) {
  const { id: param0, ...queryParams } = params;
  return request<any>(`/api/admin/question-bank/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || { successMsg: '删除成功' }),
  });
}

/** 获取题目类型与难度枚举 GET /api/admin/question-bank/enums */
export async function qbankEnums(options?: RequestOptions) {
  return request<any>('/api/admin/question-bank/enums', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 一键导入题目（format=json|csv；content=文本） POST /api/admin/question-bank/import */
export async function qbankImport(body: any, options?: RequestOptions) {
  return request<any>('/api/admin/question-bank/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || { successMsg: '导入成功' }),
    timeout: 1000000,
  });
}
