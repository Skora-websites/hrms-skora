import { createCrudRoute } from "@/lib/api/crud";

export const GET = createCrudRoute("customers").GET;
export const POST = createCrudRoute("customers").POST;
export const PATCH = createCrudRoute("customers").PATCH;
export const DELETE = createCrudRoute("customers").DELETE;
