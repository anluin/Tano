import { WebSocketConnection } from "../shared/api.ts";


declare global {
    const buildUUID: string;
}

const isErrorEvent = (event: Event): event is ErrorEvent => {
    return event.type === "error";
};

export class EndpointError extends Error {
}

export const createEndpoint = (pathname: string, method: string) => {
    return async (...args: unknown[]): Promise<unknown> => {
        const rawResponse = await fetch(`${pathname}@${method}`, {
            method: "CALL",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
            },
            body: JSON.stringify(args),
        });

        const { result, error } = await rawResponse.json();

        if (rawResponse.headers.get("X-Build-UUID") !== buildUUID) {
            window.location.reload();
            throw new Error(`build uuid mismatch`);
        }

        if (error !== undefined) {
            throw new Error(error);
        }

        return result;
    };
}

export const createSocket = (pathname: string, method: string) => {
    return (initializer: (this: WebSocketConnection) => Promise<void>): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(
                new URL(`${pathname}@${method}`, location.href).href
                    .replace("http", "ws"),
            );

            const handleMessage = (event: MessageEvent) => {
                socket.removeEventListener("message", handleMessage);

                const { buildUUID: remoteBuiltUUID } = JSON.parse(event.data);

                if (remoteBuiltUUID === buildUUID) {
                    initializer
                        .call(new WebSocketConnection(socket))
                        .then(() => {
                            socket.close();
                            resolve();
                        })
                        .catch(console.error);
                } else {
                    window.location.reload();
                    throw new Error(`build uuid mismatch`);
                }
            };

            socket.addEventListener("message", handleMessage);

            socket.addEventListener("open", () => {
                socket.send(JSON.stringify({ buildUUID }));
            });

            socket.addEventListener("error", (event) => {
                if (!isErrorEvent(event)) throw new Error();
                reject(new EndpointError(event.message));
            });
        });
    };
};
