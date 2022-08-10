export const getCookies = (request: Request): Record<string, string> =>
    Object.fromEntries(request.headers.get("Cookie")?.split(";").map(part => part.split("=")) ?? []);
