export const withoutExtension = (path: string): string =>
    path.substring(0, path.indexOf("."));

export const capitalize = (s: string) =>
    s && s[0].toUpperCase() + s.slice(1);

export const patternsForPath = (path: string): string[] => {
    const pattern = withoutExtension(path.startsWith("/") ? path : `/${path}`);

    if (pattern.endsWith("/index")) {
        const index = pattern.lastIndexOf("/index");

        return [
            ...(index !== 0 ? [
                pattern.substring(0, index)
            ] : []),
            pattern.substring(0, index + 1),
        ];
    }

    return [ pattern ];
}

export const identifierForPath = (path: string, options: { prefix?: string, suffix?: string } = {}): string => {
    const { prefix, suffix } = options;

    return (
        [
            ...(prefix ? [ prefix ] : []),
            ...withoutExtension(path).split("/"),
            ...(suffix ? [ suffix ] : []),
        ]
            .map((path, index) => (
                index !== 0
                    ? capitalize(path)
                    : path
            ))
            .join("")
    );
}
