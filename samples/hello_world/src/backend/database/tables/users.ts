import { Table } from "https://deno.land/x/tano@0.0.14/lib/backend/ormlite.ts";


export const users = new Table("users", {
    name: { type: "text", unique: true },
    passwordHash: { type: "text" },
});

await users.create({
    dropOnSchemeMismatch: true,
});
