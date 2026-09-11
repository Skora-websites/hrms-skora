import { createCrudRoute } from "@/lib/api/crud";

export const GET = createCrudRoute("leads").GET;
export const POST = createCrudRoute("leads").POST;
export const PATCH = createCrudRoute("leads").PATCH;
export const DELETE = createCrudRoute("leads").DELETE;
