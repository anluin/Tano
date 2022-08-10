export type PatchResponse = (response: Response) => void | Response;

export type EndpointAccess = {
    request: Request;
    patchResponse: (patch: PatchResponse) => void;
};

export let currentEndpointAccess: EndpointAccess | undefined;

export const setCurrentEndpointAccess = (endpointAccess: EndpointAccess) => {
    currentEndpointAccess = endpointAccess;
};

export const endpoint = <T extends CallableFunction>(endpoint: (_: EndpointAccess) => T): T =>
    (async (...args: any[]) => await endpoint(currentEndpointAccess!)(...args)) as unknown as T;
