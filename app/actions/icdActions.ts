"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { ICDItem } from "@/lib/data/icdData";
import { searchDemoIcd } from "@/lib/server/demoFakeData";

function parseIcdKeywords(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

export async function searchIcdAction(name: string): Promise<ICDItem[]> {
  const keywords = parseIcdKeywords(name?.trim() || "");
  return searchDemoIcd(keywords);
}
