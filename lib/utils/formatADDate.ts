/**
 * 西元轉西元格式
 * @param dateStr 西元日期，如 "19991029"
 */
export const formatADDate = (dateStr: string): string => {
  const cleanDate = dateStr.replace(/\D/g, "");
  const year = cleanDate.slice(0, 4);
  const month = cleanDate.slice(4, 6);
  const day = cleanDate.slice(6, 8);

  return `${year} / ${month} / ${day}`;
};


/**
 * 民國轉西元格式
 * @param dateStr 西元日期，如 "19991029"
 */
export const formatTaiwanToADDate = (dateStr: string): string => {
  const cleanDate = dateStr.replace(/\D/g, "");
  const year = Number(cleanDate.slice(0, 4))+1911;
  const month = cleanDate.slice(4, 6);
  const day = cleanDate.slice(6, 8);

  return `${year} / ${month} / ${day}`;
};