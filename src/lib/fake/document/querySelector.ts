import { HTMLElement } from "../document.ts";


enum State {
    IDLE,
    PARSE_IDENTIFIER,
}

type Token = {
    type: "identifier",
    payload: string,
};

const isAlphabetic = (character: string): boolean => /[\.a-zA-Z]/.test(character);

const tokenize = (source: string): Token[] => {
    let state: State = State.IDLE;
    let type: Token["type"] = "identifier";
    let payload = "";

    const tokens: Token[] = [];

    const process = (character: string): boolean => {
        for (; ;) {
            switch (state) {
                case State.IDLE: {
                    if (character === '\0') {
                        return true;
                    }

                    if (isAlphabetic(character)) {
                        type = "identifier";
                        payload += character;
                        state = State.PARSE_IDENTIFIER;
                        return false;
                    }

                    break;
                }
                case State.PARSE_IDENTIFIER: {
                    if (isAlphabetic(character)) {
                        type = "identifier";
                        payload += character;
                        state = State.PARSE_IDENTIFIER;
                        return false;
                    }

                    tokens.push({ type, payload });
                    state = State.IDLE;
                    continue;
                }
            }

            throw new Error(`unexpected character '${character}'`);
        }
    };

    for (let index = 0; index < source.length; ++index) {
        if (process(source[index])) {
            break;
        }
    }

    process('\0');

    return tokens;
};

export class QuerySelector {
    private readonly tokens: Token[];

    constructor(query: string) {
        this.tokens = tokenize(query);
    }

    exec(element: HTMLElement): HTMLElement[] {
        const match = (element: HTMLElement): boolean => {
            for (const token of this.tokens) {
                if (token.type === "identifier") {
                    if (element.tagName !== token.payload) {
                        return false;
                    }
                }
            }

            return true;
        };

        const result: HTMLElement[] = [];

        const traverse = (element: HTMLElement) => {
            for (const childNode of element.childNodes) {
                if (childNode instanceof HTMLElement) {
                    traverse(childNode);

                    if (match(childNode)) {
                        result.push(childNode);
                    }
                }
            }
        };

        traverse(element);

        return result;
    }
}
