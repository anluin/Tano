export const patchBundle = async (sourceFilePath: string, globals: string[]) => {
    const importRegex = /import\s*{(?<specifiers>[^}]*)}\s*from\s*(?<source>"[^"]*")/gm;
    const matches: RegExpExecArray[] = [];

    let source = await Deno.readTextFile(sourceFilePath);

    for (let match: RegExpExecArray | null; (match = importRegex.exec(source));) {
        matches.push(match);

        if (match.index === importRegex.lastIndex) {
            importRegex.lastIndex++;
        }
    }

    for (let index = matches.length; (index--) > 0;) {
        const match = matches[index];
        const [text, rawSpecifiers, path] = match;

        const specifiers = (
            rawSpecifiers
                .split(",")
                .map(specifier =>
                    specifier
                        .split("as")
                        .map(identifier => identifier.trim())
                        .join(":")
                )
                .join(",")
        );

        source = (
            source.substring(0, match.index) +
            `const {${specifiers}}=await import(${path})` +
            source.substring(match.index + text.length)
        );
    }

    await Deno.writeTextFile(sourceFilePath, (
        `export const render=async({${globals.join()}})=>{${source.trim()}};`
    ).replace("\n//# sourceMappingURL=bundle.js.map};", "};\n//# sourceMappingURL=bundle.js.map"));
};
