/**
 * 西元轉民國格式
 * @param dateStr 西元日期，如 "19991029"
 */
export function convertToMinguo(dateStr: string | any): string {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  const cleanDate = dateStr.replace(/\D/g, "");
  
  if (cleanDate.length !== 8) return dateStr; // 長度不對就原樣回傳

  const adYear = parseInt(cleanDate.slice(0, 4), 10);
  const month = cleanDate.slice(4, 6);
  const day = cleanDate.slice(6, 8);
  
  const minguoYear = adYear - 1911;
  
  return `民國 ${minguoYear} / ${month} / ${day} /`;
}