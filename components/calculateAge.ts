export function calculateAge(birthStr: string) {
  if (!birthStr || birthStr.length !== 8) return "資料錯誤";

  // 1. 解析生日 YYYYMMDD
  const birthYear = parseInt(birthStr.slice(0, 4));
  const birthMonth = parseInt(birthStr.slice(4, 6)) - 1; // JS Month 從 0 開始
  const birthDay = parseInt(birthStr.slice(6, 8));
  const birthDate = new Date(birthYear, birthMonth, birthDay);

  // 2. 獲取當前時間 (2026/05/04)
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  // 3. 調整日期借位
  if (days < 0) {
    // 借上個月的天數
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
    months--;
  }

  if (months < 0) {
    // 借年
    months += 12;
    years--;
  }

  // 4. 根據需求格式化輸出
  if (years < 5) {
    return `${years}歲${months}個月${days}天`;
  } else {
    return `${years}歲`;
  }
}