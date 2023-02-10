const format = (strings: TemplateStringsArray, ...expressions: (string | number)[]): string => {
    const string = strings.slice(1).reduce((carry, string, index) => {
        const expression = expressions[index];

        return `${carry}${expression}${string}`;
    }, strings[0]);

    const lines = string.split("\n");

    const firstLineIdx = lines.findIndex(line => line.trim().length > 0);
    const lastLineIdx = lines.findLastIndex(line => line.trim().length > 0);

    if (firstLineIdx === -1 || lastLineIdx === -1) {
        return string.trim();
    }

    const numWhitespacesToSkip = [...lines[firstLineIdx]].findIndex(character => character !== ' ');

    return lines
        .slice(firstLineIdx, lastLineIdx + 1)
        .reduce((carry, line) => {
            const numWhitespaces = [...line].findIndex(character => character !== ' ');

            return `${carry}${line.slice(Math.min(numWhitespaces, numWhitespacesToSkip))}\n`;
        }, '');
};

export const ts = format;
export const tsx = format;
