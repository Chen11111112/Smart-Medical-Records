"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { ModelItem } from "@/lib/data/modelData";
import { getDemoModelList } from "@/lib/server/demoFakeData";

export async function getModelListAction(): Promise<ModelItem[]> {
  return getDemoModelList();
}
