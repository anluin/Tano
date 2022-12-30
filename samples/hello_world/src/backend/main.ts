import { serve } from "https://deno.land/x/tano@0.0.14/lib/backend.ts";

import "./database/seeding.ts";


await serve();
