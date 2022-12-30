import { JSONValue } from "./types/json.ts";

export class WebSocketConnection<I extends JSONValue = JSONValue, O extends JSONValue = I> {
    private __socket: WebSocket;

    constructor(_socket: WebSocket) {
        this.__socket = _socket;
    }

    send(data: O) {
        this.__socket.send(JSON.stringify(data));
    }

    close() {
        this.__socket.close();
    }

    async* listen() {
        let resolve: (event: I | undefined) => void;
        let pending: Promise<I | undefined>;

        const handleMessage = (event: MessageEvent) => {
            resolve(JSON.parse(event.data));
        };

        const handleError = (event: Event) => {
            resolve(undefined);
        };

        const handleClose = (event: Event) => {
            resolve(undefined);
        };

        this.__socket.addEventListener("message", handleMessage);
        this.__socket.addEventListener("error", handleError);
        this.__socket.addEventListener("close", handleClose);

        for (; ;) {
            pending = new Promise<I | undefined>(_ => resolve = _);
            const message = await pending;

            if (message) {
                yield message;
            } else {
                break;
            }
        }

        this.__socket.removeEventListener("close", handleClose);
        this.__socket.removeEventListener("error", handleError);
        this.__socket.removeEventListener("message", handleMessage);
    }
}
