import { Channel } from "../shared/channel.ts";


let socket: WebSocket | undefined = undefined;

export class RemoteError extends Error {
}

export const call = async (endpoint: string, args: unknown[]) => {
    const rawResponse = await fetch(endpoint, {
        method: "CALL",
        body: JSON.stringify(args),
    });

    const responseText = await rawResponse.text();

    if (rawResponse.status === 200) {
        if (responseText) {
            const { type, result } = JSON.parse(responseText);

            if (type === "error") {
                throw new RemoteError(result);
            }

            switch (type) {
                case "simple":
                    return result;
                case "channel": {
                    const channel = new Channel();

                    socket = new WebSocket(new URL(`/socket/${result}`, location.href.replace("http", "ws")));

                    channel.__send = (message) => {
                        socket?.send(JSON.stringify({
                            endpoint,
                            message,
                        }));
                    };

                    channel.__close = () => {
                        socket?.close();
                    };

                    socket.addEventListener("open", () => {
                        for (const listener of channel.__connectedEventListeners ?? []) {
                            listener();
                        }
                    });

                    socket.addEventListener("close", () => {
                        for (const listener of channel.__disconnectedEventListeners ?? []) {
                            listener();
                        }
                    });

                    socket.addEventListener("message", ({ data }) => {
                        const { endpoint, message } = JSON.parse(data);

                        for (const listener of channel.__messageEventListeners ?? []) {
                            listener({ endpoint, message });
                        }
                    });

                    return channel;
                }
                default:
                    throw new Error("unknown result type");
            }
        }
    } else {
        throw new RemoteError(responseText);
    }
}
