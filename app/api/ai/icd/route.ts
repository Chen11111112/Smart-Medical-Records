import { createAiRouteHandlers } from "@/lib/server/aiApiRoute";

const handlers = createAiRouteHandlers("icd");

export const OPTIONS = handlers.OPTIONS;
export const POST = handlers.POST;
