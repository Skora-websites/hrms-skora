import { createCrudRoute } from "@/lib/api/crud";

export const GET = createCrudRoute("contacts").GET;
export const POST = createCrudRoute("contacts").POST;
export const PATCH = createCrudRoute("contacts").PATCH;
export const DELETE = createCrudRoute("contacts").DELETE;
