interface ExtendableEvent extends Event {
    waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
    readonly clientId: string;
    readonly handled: Promise<undefined>;
    readonly preloadResponse: Promise<unknown>;
    readonly request: Request;
    readonly resultingClientId: string;

    respondWith(r: Response | PromiseLike<Response>): void;
}

type InstallEventListener = (event: ExtendableEvent) => void;
type ActivateEventListener = (event: ExtendableEvent) => void;
type FetchEventListener = (event: FetchEvent) => void;

interface Window {
    clients: {
        claim(): Promise<unknown>;
    };

    addEventListener(type: "install", listener: InstallEventListener): void;

    addEventListener(type: "activate", listener: ActivateEventListener): void;

    addEventListener(type: "fetch", listener: FetchEventListener): void;
}
