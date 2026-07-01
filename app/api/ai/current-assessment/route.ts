import { createAiRouteHandlers } from "@/lib/server/aiApiRoute";

const handlers = createAiRouteHandlers("current-assessment");

export const OPTIONS = handlers.OPTIONS;
export const POST = handlers.POST;
