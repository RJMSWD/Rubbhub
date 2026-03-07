export const mergeFetchedEntryIntoFeed = <T extends { id: string }>(entries: T[], entry: T): T[] => {
  const targetIndex = entries.findIndex((item) => item.id === entry.id);
  if (targetIndex === -1) {
    return entries;
  }

  return entries.map((item, index) => (index === targetIndex ? entry : item));
};
