import { JSONValue } from "../types/json.ts";
import { throwError } from "./utils.ts";


export type MessageEvent<Message extends JSONValue> = {
    endpoint: string;
    message: Message;
};

export type ConnectedEventListener = () => void;
export type DisconnectedEventListener = () => void;
export type MessageEventListener<Message extends JSONValue> = (event: MessageEvent<Message>) => void;

export type EventListeners<Message extends JSONValue> = {
    "connected": ConnectedEventListener,
    "disconnected": DisconnectedEventListener,
    "message": MessageEventListener<Message>,
};

export class Channel<Input extends JSONValue = JSONValue, Output extends JSONValue = JSONValue> {
    __connectedEventListeners?: Set<EventListeners<JSONValue>["connected"]>;
    __disconnectedEventListeners?: Set<EventListeners<JSONValue>["disconnected"]>;
    __messageEventListeners?: Set<EventListeners<JSONValue>["message"]>;
    __send?: (message: JSONValue) => void;
    __close?: () => void;

    get isConnected() {
        return !!this.__send;
    }

    send(message: Input) {
        (this.__send ?? throwError(`channel is not connected`))?.(message);

        return this;
    }

    close() {
        (this.__close ?? throwError(`channel is not connected`))?.();

        return this;
    }

    on<Event extends keyof EventListeners<Output>>(event: Event, listener: EventListeners<Output>[Event]) {
        switch (event) {
            case "connected":
                (this.__connectedEventListeners ??= new Set())
                    .add(listener as EventListeners<JSONValue>["connected"]);
                break;
            case "disconnected":
                (this.__disconnectedEventListeners ??= new Set())
                    .add(listener as EventListeners<JSONValue>["disconnected"]);
                break;
            case "message":
                (this.__messageEventListeners ??= new Set())
                    .add(listener as EventListeners<JSONValue>["message"]);
                break;
            default:
                throw new Error(`unknown event: '${event}'`);
        }

        return this;
    }
}

