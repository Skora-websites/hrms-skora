import { createCrudRoute } from "@/lib/api/crud";

export const GET = createCrudRoute("activities").GET;
export const POST = createCrudRoute("activities").POST;
export const PATCH = createCrudRoute("activities").PATCH;
export const DELETE = createCrudRoute("activities").DELETE;
