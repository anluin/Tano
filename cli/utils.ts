export const sha1 = async (str: string): Promise<string> =>
    Array.prototype.map.call(
        new Uint8Array(
            await crypto.subtle.digest(
                "SHA-1",
                new TextEncoder()
                    .encode(str)
            ),
        ), _ => (
            ('00' + _.toString(16))
                .slice(-2))
    )
        .join('');

