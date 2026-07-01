import { createAiRouteHandlers } from "@/lib/server/aiApiRoute";

const handlers = createAiRouteHandlers("history-summary");

export const OPTIONS = handlers.OPTIONS;
export const POST = handlers.POST;
