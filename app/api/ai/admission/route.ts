import { createAiRouteHandlers } from "@/lib/server/aiApiRoute";

const handlers = createAiRouteHandlers("admission");

export const OPTIONS = handlers.OPTIONS;
export const POST = handlers.POST;
