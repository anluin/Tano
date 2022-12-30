import { Component } from "./jsx.ts";


declare global {
    const __promises: Promise<unknown>[];
}


export const isInstalled = () => (
    window.matchMedia
        ?.('(display-mode: standalone)')
        .matches ?? undefined
);

export const ssrRenderBlocking = ssr
    ? <T>(callback: () => Promise<T>): Promise<T> => {
        const promise = callback();
        __promises.push(promise);
        return promise;
    }
    : <T>(callback: () => Promise<T>): Promise<T> => callback();

export const Skip: Component = () => undefined;
