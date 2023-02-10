export * from "../shared/utils.ts";

export const getCookies = (request: Request): Record<string, string> =>
    Object.fromEntries((
        request.headers.get("Cookie")
            ?.split(/\s*;\s*/)
            .map(part => part.split(/\s*=\s*/))

    ) ?? []);
