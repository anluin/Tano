import { JSONValue } from "../types/json.ts";


export const timeout = (delay: number) =>
    new Promise(resolve =>
        setTimeout(resolve, delay)
    );

export type ListenOptions = {
    reconnect?: {
        interval?: number,
        numOfAttempts?: number,
        onOpen?: () => void,
        onClose?: () => void,
        shouldReconnect?: () => boolean,
    },
};

export class WebSocketConnection<I extends JSONValue = JSONValue, O extends JSONValue = JSONValue> {
    private readonly __promises: Set<Promise<unknown>>;
    private readonly __pathname: string;

    private __socket?: WebSocket;

    constructor(pathname: string, socket?: WebSocket) {
        this.__promises = new Set();
        this.__pathname = pathname;
        this.__socket = socket;
    }

    get socket() {
        if (this.__socket) {
            return this.__socket;
        } else {
            throw new Error("socket is't connected");
        }
    }

    get isConnected() {
        return !!this.__socket;
    }

    close() {
        this.__socket?.close();
        this.__socket = undefined;
    }

    async connect() {
        if (!this.__socket) {
            return await new Promise<this>((resolve, reject) => {
                const url = new URL(this.__pathname, `${location}`.replace("http", "ws"));
                const socket = new WebSocket(url);

                const handleOpen = () => {
                    removeEventListeners();
                    this.__socket = socket;
                    resolve(this);
                };

                const handleError = (event: ErrorEvent) => {
                    removeEventListeners();
                    reject(event.error);
                };

                const removeEventListeners = () => {
                    socket.removeEventListener("open", handleOpen as () => void);
                    socket.removeEventListener("error", handleError as () => void);
                };

                socket.addEventListener("open", handleOpen as () => void);
                socket.addEventListener("error", handleError as () => void);
            });
        } else {
            return this;
        }
    }

    async send(data: I, options?: { connect?: boolean }) {
        options?.connect && await this.connect();
        this.socket.send(JSON.stringify(data));
    }

    async* listen(options?: ListenOptions) {
        const buffer: O[] = [];

        let socket = this.socket;
        let resolve: undefined | ((event: O | undefined) => void);

        const processMessage = (message: O | undefined) => {
            if (message) {
                buffer.push(message);
            }

            resolve?.(message);
            resolve = undefined;
        };

        const handleMessage = (event: MessageEvent) => {
            processMessage(JSON.parse(event.data));
        };

        const handleError = () => {
            removeEventListeners();
            processMessage(undefined);
            this.__socket = undefined;
        };

        const handleClose = () => {
            removeEventListeners();
            processMessage(undefined);
            this.__socket = undefined;
        };

        const addEventListeners = () => {
            socket.addEventListener("message", handleMessage);
            socket.addEventListener("error", handleError);
            socket.addEventListener("close", handleClose);
        };

        const removeEventListeners = () => {
            socket.removeEventListener("close", handleClose);
            socket.removeEventListener("error", handleError);
            socket.removeEventListener("message", handleMessage);
        };

        addEventListeners();

        for (; ;) {
            if (await new Promise<O | undefined>(_ => resolve = _)) {
                for (const message of buffer.splice(0)) {
                    yield message;
                }
            } else {
                if (options?.reconnect?.interval) {
                    options.reconnect?.onClose?.();

                    if (!(options?.reconnect?.shouldReconnect?.())) {
                        break;
                    }
                    removeEventListeners();

                    for (let index = 0; index < (options?.reconnect?.numOfAttempts ?? Infinity); index++) {
                        await timeout(options?.reconnect?.interval ?? 0);

                        try {
                            await this.connect();
                            socket = this.socket;
                            options.reconnect?.onOpen?.();
                        } catch (_) {
                            continue;
                        }

                        break;
                    }

                    addEventListeners();
                    continue;
                }

                break;
            }
        }

        removeEventListeners();
    }
}

export const resolvablePromise = <T = void>(): Promise<T> & { resolve: (value: T) => void, reject: (...error: ([ unknown ] | [])) => void } => {
    let resolve: (value: T) => void;
    let reject: (...error: ([ unknown ] | [])) => void;

    return Object.assign(new Promise<T>((...args) => [ resolve, reject ] = args), {
        resolve: resolve!,
        reject: reject!,
    });
};

export const throwError = (message?: string) => {
    throw new Error(message);
};
