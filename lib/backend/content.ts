const fileExtension2ContentTypeMap = {
    ".txt": "plain/text",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".css": "text/css;charset=utf-8",
    ".js": "application/javascript;charset=utf-8",
    ".json": "application/json;charset=utf-8",
    ".css.map": "application/json;charset=utf-8",
    ".js.map": "application/json;charset=utf-8",
    ".wasm": "application/wasm",
} as const;

export type FileExtension = keyof typeof fileExtension2ContentTypeMap;
export type ContentType = typeof fileExtension2ContentTypeMap[FileExtension];

export const resolveContentType = (path: string): ContentType | undefined => {
    for (let index = 0; (index = path.indexOf(".", index)) != -1;) {
        const contentType = (fileExtension2ContentTypeMap as Record<string, ContentType>)[path.substring(index++)];

        if (contentType) {
            return contentType
        }
    }
};
