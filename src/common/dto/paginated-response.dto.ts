export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  items: T[];
  meta: PaginationMeta;

  constructor(items: T[], page: number, limit: number, totalItems: number) {
    this.items = items;
    this.meta = {
      page: Number(page),
      limit: Number(limit),
      totalItems: Number(totalItems),
      totalPages: Math.ceil(Number(totalItems) / (Number(limit) || 1)),
    };
  }
}
