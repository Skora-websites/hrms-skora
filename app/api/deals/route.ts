import { createCrudRoute } from "@/lib/api/crud";

export const GET = createCrudRoute("deals").GET;
export const POST = createCrudRoute("deals").POST;
export const PATCH = createCrudRoute("deals").PATCH;
export const DELETE = createCrudRoute("deals").DELETE;
