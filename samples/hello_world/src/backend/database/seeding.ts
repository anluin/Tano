import * as bcrypt from "https://deno.land/x/bcrypt@v0.3.0/mod.ts";

import { users } from "./tables/users.ts";


await users.findOrInsert({ name: "Christian Cavasin" }, async ({ name }) => ({
    name, passwordHash: await bcrypt.hash("eistee100"),
}));
