import { Signal } from "https://deno.land/x/tano@0.0.14/lib/frontend.ts";

import * as api from "../backend/api/session.ts";
import * as rtc from "../backend/api/rtc.ts";

import { handleSocketConnection } from "./utils/api.ts";

export const $currentSession = await Signal.fromInjectedData("currentSession", api.getCurrentSession);
export const $loggedIn = $currentSession.map(currentSession => !!currentSession);


csr && handleSocketConnection(rtc.connect, $loggedIn, async function () {
    console.log("open");

    for await (const event of this.listen()) {
        console.log("message", event);
    }

    console.log("close");
});
