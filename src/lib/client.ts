import { Component, render as r } from "./react.ts";


export const render = async (component: Component<{}>) => {
    document.querySelector("html")
        ?.replaceWith(await r(component({})));
};

export const createEndpoint = (pathname: string, method: string) => {
    return async (...args: any): Promise<any> => {
        const rawResponse = await fetch(pathname, {
            method: "CALL",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
            },
            body: JSON.stringify({
                method,
                args,
            }),
        });

        const { result, error } = await rawResponse.json();

        if (error !== undefined) {
            throw error;
        }

        return result;
    };
};
