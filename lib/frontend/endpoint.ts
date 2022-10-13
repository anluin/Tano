import { deserialize, serialize } from "../shared/utils.ts";


export const createEndpoint = (pathname: string, method: string) => {
    return async (...args: unknown[]): Promise<unknown> => {
        const rawResponse = await fetch(pathname, {
            method: "CALL",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
            },
            body: JSON.stringify({
                method,
                args: args.map(serialize),
            }),
        });

        const { result, type, error } = await rawResponse.json();

        if (type === "websocket") {
            const socket = new WebSocket(`ws://localhost:4501/${result.uuid}`);

            return (message: string) => {
                socket.send(message);
            };
        }

        if (error !== undefined) {
            throw error;
        }

        return deserialize(result);
    };
};
