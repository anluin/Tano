import { Signal } from "./signal.ts";

export const $pathname = new Signal(location.pathname);
export const $route = new Signal<JSX.Element>(undefined);
