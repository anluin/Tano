export const workaroundForAsyncHooks = async (path: string, name: string, globals: Record<string, string>) => {
    const rendererSource = await Deno.readTextFile(path);
    const mapping = (
        Object.entries(globals)
            .map(([ key, value ]) => (
                key !== value
                    ? `${key}:${value}`
                    : key
            ))
            .join(",")
    );

    await Deno.writeTextFile(path, (
        `export const ${name}=async(globals,...args)=>{const{${mapping}}=globals;${rendererSource.trim()}};`
    ));
};
