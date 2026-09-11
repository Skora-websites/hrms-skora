import { createCrudRoute } from "@/lib/api/crud";

export const GET = createCrudRoute("tasks").GET;
export const POST = createCrudRoute("tasks").POST;
export const PATCH = createCrudRoute("tasks").PATCH;
export const DELETE = createCrudRoute("tasks").DELETE;
