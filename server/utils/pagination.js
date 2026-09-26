export const getPagination = (query, defaultLimit, maxLimit) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? defaultLimit);
  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > maxLimit ||
      !Number.isSafeInteger(offset)) {
    return null;
  }

  return { page, limit, offset };
};
