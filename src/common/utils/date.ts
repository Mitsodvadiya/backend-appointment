export const getStartOfDay = (date?: Date | string) => {
  const d = date ? new Date(date) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
