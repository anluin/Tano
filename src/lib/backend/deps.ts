import * as flags from "https://deno.land/std@0.182.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.182.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.182.0/fs/mod.ts";

import {
    Comment,
    DocumentFragment,
    Element as SVGElement,
    Element as HTMLElement,
    HTMLDocument,
    Text
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/src/api.ts";

import { Document, DOMImplementation } from "https://deno.land/x/deno_dom@v0.1.36-alpha/src/dom/document.ts";
import { CTOR_KEY } from "https://deno.land/x/deno_dom@v0.1.36-alpha/src/constructor-lock.ts";

export * as esbuild from "https://deno.land/x/esbuild@v0.17.15/mod.js";

export const dom = {
    Comment,
    DocumentFragment,
    SVGElement,
    HTMLElement,
    HTMLDocument,
    Text,
    Document,
    createHTMLDocument: ((domImplementation?: DOMImplementation) => (titleStr?: string) => (
        (domImplementation ??= new DOMImplementation(CTOR_KEY)).createHTMLDocument(titleStr)
    ))()
};

export const std = {
    flags,
    path,
    fs,
} as const;
