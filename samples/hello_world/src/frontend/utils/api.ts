import { WebSocketConnection } from "https://deno.land/x/tano@0.0.14/lib/shared/api.ts";
import { ReadonlySignal } from "https://deno.land/x/tano@0.0.14/lib/frontend/signal.ts";
import { Effect } from "https://deno.land/x/tano@0.0.14/lib/frontend/effect.ts";
import { timeout } from "https://deno.land/x/tano@0.0.14/lib/shared/utils.ts";


export type SocketEndpoint<T extends WebSocketConnection> = (initializer: (this: T) => Promise<void>) => Promise<void>;
export const handleSocketConnection = <T extends WebSocketConnection = WebSocketConnection>(endpoint: SocketEndpoint<T>, $enabled: ReadonlySignal<boolean>, handler: (this: T) => Promise<void>, reconnectDelay: number = 1000) => {
    new Effect(((connection?: WebSocketConnection) => async () => {
        connection?.close();
        connection = undefined;

        while ($enabled.value) {
            try {
                await endpoint(async function () {
                    await handler.call(connection = this);
                });
            } catch (_) {
                await timeout(reconnectDelay);
            }
        }
    })());
};
