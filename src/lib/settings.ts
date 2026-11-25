export const ITEM_PER_PAGE = 10;

export const getPageNumber = (page?: string) => {
  const parsedPage = Number(page);

  return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
};
