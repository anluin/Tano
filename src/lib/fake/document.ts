import { QuerySelector } from "./document/querySelector.ts";


const tagNameSymbol = Symbol("tagName");
const parentNodeSymbol = Symbol("parentNode");
const childNodesSymbol = Symbol("childNodes");

const querySelectorCache: Record<string, QuerySelector> = {};

export class NodeList extends Array<Node> {
}

const encodeHTMLEntities = (text: string) =>
    text.replace(/[\u00A0-\u9999<>\&]|\s/g, match => '&#' + match.charCodeAt(0) + ';')

export class Document {
    readonly rootElement = new HTMLDocument();

    constructor() {
        this.rootElement.appendChild(this.createElement("html"));
    }

    createElement(tagName: string): HTMLElement {
        const classes: Record<string, { new(tagName: string): HTMLElement }> = {
            "html": HTMLHtmlElement,
            "body": HTMLBodyElement,
            "script": HTMLScriptElement,
        };

        return new (classes[tagName] ?? HTMLElement)(tagName);
    }

    createElementNS(_: string, name: string) {
        return this.createElement(name);
    }

    createTextNode(textContent: string): Text {
        return new Text(textContent);
    }

    createComment(textContent: string): Comment {
        return new Comment(textContent);
    }

    createDocumentFragment(): DocumentFragment {
        return new DocumentFragment();
    }

    querySelectorAll(query: string): HTMLElement[] {
        return this.rootElement.querySelectorAll(query)
    }

    querySelector(query: string): HTMLElement | undefined {
        return this.rootElement.querySelector(query)
    }

    appendChild(node: Node): Node {
        return this.rootElement.appendChild(node);
    }

    addEventListener(...args: any) {}
}

export class Node {
    [parentNodeSymbol]?: Node;
    readonly [childNodesSymbol]: NodeList = new NodeList();

    get isConnected(): boolean {
        return this.parentNode?.isConnected ?? false;
    }

    get parentNode() {
        return this[parentNodeSymbol];
    }

    get childNodes() {
        return this[childNodesSymbol];
    }

    remove(): Node {
        return this.parentNode?.removeChild(this) ?? this;
    }

    removeChild(child: Node): Node {
        const index = this.childNodes.indexOf(child) ?? -1;

        if (index !== -1) {
            this.childNodes.splice(index, 1);
            child[parentNodeSymbol] = undefined;
        }

        return child;
    }

    insertBefore(newNode: Node, referenceNode: Node | null | undefined): Node {
        const index = this.childNodes.indexOf(referenceNode!);

        this.childNodes.splice((
            index === -1
                ? this.childNodes.length
                : index
        ), 0, ...(
            newNode instanceof DocumentFragment
                ? [ ...newNode.childNodes ]
                : [ newNode ]
        ).map(node => {
            const result = node.remove();
            node[parentNodeSymbol] = this;
            return result;
        }));

        return newNode;
    }

    replaceWith(...nodes: Node[]): Node {
        for (const node of nodes) {
            this.parentNode?.insertBefore(node, this);
        }

        return this.remove();
    }

    replaceChild(newChild: Node, oldChild: Node): Node {
        if (this.childNodes.indexOf(newChild) !== -1) {
            throw new Error();
        }

        this.insertBefore(newChild, oldChild);
        return oldChild.remove();
    }

    appendChild(node: Node): Node {
        return this.insertBefore(node, undefined);
    }

    addEventListener(...args: any) {}
}

export class DocumentFragment extends Node {

}

export class HTMLElement extends Node {
    readonly [tagNameSymbol]: string;

    constructor(tagName: string) {
        super();
        this[tagNameSymbol] = tagName;
    }

    get tagName() {
        return this[tagNameSymbol];
    }

    get innerHTML(): string {
        return (
            [ ...this.childNodes ]
                .map(childNode => {
                    if (childNode instanceof HTMLElement) {
                        return childNode.outerHTML;
                    }

                    if (childNode instanceof Text) {
                        return encodeHTMLEntities(childNode.textContent);
                    }

                    if (childNode instanceof Comment) {
                        return `<!--${encodeHTMLEntities(childNode.textContent)}-->`;
                    }

                    console.error(childNode);
                    throw new Error();
                })
                .join("")
        );
    }

    get outerHTML(): string {
        const { tagName } = this;
        const properties = (
            Object.entries(this)
                .filter(([ , value ]) => value !== undefined)
                .reduce((carry, [ name, value ]) => (
                    `${carry} ${{
                        "className": "class",
                    }[name] ?? name}=${JSON.stringify(value)}`
                ), '')
        );

        if ([ "meta", "link" ].indexOf(tagName) === -1) {
            return `<${tagName}${properties}>${this.innerHTML}</${tagName}>`;
        } else {
            return `<${tagName}${properties}/>`;
        }
    }

    querySelectorAll(query: string): HTMLElement[] {
        return (
            (querySelectorCache[query] ??= new QuerySelector(query))
                .exec(this)
        );
    }

    querySelector(query: string): HTMLElement | undefined {
        return this.querySelectorAll(query)[0];
    }
}

export class SVGElement extends HTMLElement {}

export class HTMLDocument extends HTMLElement {
    constructor() {
        super("");
    }

    get isConnected(): boolean {
        return true;
    }
}

export class HTMLBodyElement extends HTMLElement {
    constructor() {
        super("body");
    }
}

export class HTMLHtmlElement extends HTMLElement {
    lang?: string;

    constructor() {
        super("html");
    }
}

export class HTMLScriptElement extends HTMLElement {
    src?: string;
    type?: string;

    constructor() {
        super("script");
    }
}

export class Comment extends Node {
    textContent: string;

    constructor(textContent: string) {
        super();
        this.textContent = textContent;
    }
}

export class Text extends Node {
    textContent: string;

    constructor(textContent: string) {
        super();
        this.textContent = textContent;
    }
}

