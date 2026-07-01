import { createAiRouteHandlers } from "@/lib/server/aiApiRoute";

const handlers = createAiRouteHandlers("chief-complaint");

export const OPTIONS = handlers.OPTIONS;
export const POST = handlers.POST;
