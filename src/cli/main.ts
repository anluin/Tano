import { normalize, join, relative, resolve } from "https://deno.land/std@0.150.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.150.0/fs/exists.ts";
import { walk, WalkOptions } from "https://deno.land/std@0.150.0/fs/walk.ts";

import * as esbuild from "https://deno.land/x/esbuild@v0.14.53/mod.js";
import { httpImports } from "https://deno.land/x/esbuild_plugin_http_imports@v1.2.4/index.ts";

import { routesTemplate } from "./templates/routes.ts";
import { staticsTemplate } from "./templates/statics.ts";
import { serviceWorkerTemplate } from "./templates/serviceWorker.ts";
import { pwaComponentTemplate } from "./templates/pwa.ts";

import { importMapPlugin } from "./esbuild/plugins/importMap.ts";
import { svgLoaderPlugin } from "./esbuild/plugins/svgLoader.ts";

import { workaroundForAsyncHooks } from "./utils/asyncHooks.ts";
import { getMimeType } from "./utils/mimeTypes.ts";
import { injectTemplate } from "./templates/inject.ts";
import { identifierForPath, patternsForPath, withoutExtension } from "./utils/helper.ts";
import { endpointsPlugin } from "./esbuild/plugins/endpoints.ts";
import { endpointsTemplate } from "./templates/endpoints.ts";


const workspaceDirectoryPath = resolve(normalize(Deno.args[0] ?? Deno.cwd()));
const buildDirectoryPath = join(workspaceDirectoryPath, "build");
const buildStaticDirectoryPath = join(buildDirectoryPath, "static");
const configDirectoryPath = join(workspaceDirectoryPath, "config");
const tanoFilePath = join(configDirectoryPath, "tano.json");
const denoFilePath = join(workspaceDirectoryPath, "deno.json");
const routesFilePath = join(buildDirectoryPath, "routes.ts");
const endpointsFilePath = join(buildDirectoryPath, "endpoints.ts");
const staticsFilePath = join(buildDirectoryPath, "statics.ts");
const rendererFilePath = join(buildDirectoryPath, "ssr.js");
const sourceDirectoryPath = join(workspaceDirectoryPath, "src");
const routesDirectoryPath = join(sourceDirectoryPath, "routes");
const staticDirectoryPath = join(sourceDirectoryPath, "static");
const mainTsxFilePath = join(sourceDirectoryPath, "main.tsx");
const faviconFilePath = join(staticDirectoryPath, "favicon.svg");
const faviconStaticFilePath = join(buildStaticDirectoryPath, "favicon.ico");
const staticIconsDirectoryPath = join(buildStaticDirectoryPath, "icons");
const manifestStaticFilePath = join(buildStaticDirectoryPath, "manifest.json");
const serviceWorkerStaticFilePath = join(buildStaticDirectoryPath, "serviceWorker.js");
const bundleStaticDirectoryPath = join(buildStaticDirectoryPath, "bundle");
const componentsDirectoryPath = join(buildDirectoryPath, "components");
const pwaFilePath = join(componentsDirectoryPath, "ProgressiveWebApp.tsx");

const tanoConfig = JSON.parse(await Deno.readTextFile(tanoFilePath));
const denoConfig = JSON.parse(await Deno.readTextFile(denoFilePath));

const importMapFilePath = join(workspaceDirectoryPath, denoConfig?.importMap ?? "import_map.json");

await Deno.mkdir(componentsDirectoryPath, { recursive: true });

export type Route = {
    path: string;
    relativePath: string,
    patterns: string[],
    identifier: string,
};

export type Endpoint = {
    path: string;
    relativePath: string,
    patterns: string[],
    identifier: string,
};

export type StaticFile = {
    path: string;
    relativePath: string,
    contentType: string,
    patterns: string[],
};

export type Workspace = {
    routes: Route[],
    endpoints: Endpoint[],
    statics: StaticFile[],
};

const pathToStaticFile = (path: string, relativeTo: string = staticDirectoryPath) => {
    const relativePath = relative(workspaceDirectoryPath, path);
    const relativeToStaticDirectoryPath = relative(relativeTo, path);
    const patterns = patternsForPath(relativeToStaticDirectoryPath);
    const contentType = getMimeType(relativePath);

    return { path, relativePath, patterns, contentType };
};

const walkWorkspace = async (): Promise<Workspace> => {
    const routesWalkOptions: WalkOptions = { match: [ /\.tsx?$/m ] };
    const staticsWalkOptions: WalkOptions = { includeDirs: false };
    const routes: Route[] = [];
    const endpoints: Endpoint[] = [];
    const statics: StaticFile[] = [];

    for await(const { path } of walk(routesDirectoryPath, routesWalkOptions)) {
        const relativePath = relative(routesDirectoryPath, path);
        const patterns = patternsForPath(withoutExtension(relativePath));

        if (path.endsWith(".tsx")) {
            const identifier = identifierForPath(relativePath, { prefix: "render" });

            routes.push({ path, relativePath, patterns, identifier });
        }

        if (path.endsWith(".ts")) {
            const identifier = identifierForPath(relativePath, { suffix: "Endpoint" });

            endpoints.push({ path, relativePath, patterns, identifier });
        }
    }

    for await(const { path } of walk(staticDirectoryPath, staticsWalkOptions)) {
        statics.push(pathToStaticFile(path));
    }

    return { routes, endpoints, statics };
};


const renderSvg = async (src: string, dest: string, size: number | { width: number, height: number }) => {
    const { width, height } = (
        typeof size === "number"
            ? { width: size, height: size }
            : size
    );

    const process = Deno.run({
        cmd: `convert -background none -density 1200 -resize ${width}x${height} ${src} ${dest}`.split(" "),
    });

    await process.status();
    process.close();
};


const workspace = await walkWorkspace();

export type FaviconInfo = {
    "source"?: string,
};

export type ManifestInfo = {
    "name"?: string,
    "shortName"?: string,
    "description"?: string,
    "themeColor"?: string,
    "backgroundColor"?: string,
    "display"?: string,
    "scope"?: string,
    "startUrl"?: string,
    "icon"?: {
        "source"?: string,
    },
    "maskableIcon"?: {
        "source"?: string,
    },
};

export type ServiceWorkerInfo = {
    "cacheName"?: string,
};

const faviconSource: FaviconInfo = tanoConfig?.generate?.favicon?.source;
const manifestInfo: ManifestInfo = tanoConfig?.generate?.manifest;
const serviceWorkerInfo: ServiceWorkerInfo = tanoConfig?.generate?.serviceWorker;

if (faviconSource !== undefined || serviceWorkerInfo !== undefined) {
    await Deno.mkdir(buildStaticDirectoryPath, { recursive: true });
}

if (faviconSource !== undefined) {
    await renderSvg(faviconFilePath, faviconStaticFilePath, 64);
}

if (manifestInfo !== undefined) {
    await Deno.mkdir(staticIconsDirectoryPath, { recursive: true });

    const iconSource = manifestInfo.icon?.source;
    const maskableIconSource = manifestInfo.maskableIcon?.source;

    type Icon = {
        src: string,
        sizes: string,
        type: string,
        "purpose"?: "maskable"
    };

    const renderIcon = async (source: string, name: string, size: number, maskable: boolean): Promise<Icon> => {
        const path = join(staticIconsDirectoryPath, name);

        await renderSvg(join(staticDirectoryPath, source), path, size);

        return {
            "src": `/${relative(buildStaticDirectoryPath, path)}`,
            "sizes": `${size}x${size}`,
            "type": "image/png",
            ...maskable ? {
                "purpose": "maskable"
            } : {},
        };
    };

    const iconSizes = [ 192, 256, 384, 512 ];
    const icons = await Promise.all([
        ...iconSource !== undefined ? iconSizes.map(async (size) => {
            const path = join(staticIconsDirectoryPath, `icon-${size}x${size}.png`);

            await renderSvg(join(staticDirectoryPath, iconSource), path, size);

            return {
                "src": `/${relative(buildStaticDirectoryPath, path)}`,
                "sizes": `${size}x${size}`,
                "type": "image/png",
            };
        }) : [],
        ...maskableIconSource !== undefined
            ? iconSizes.map(size =>
                renderIcon(maskableIconSource, `icon-maskable-${size}x${size}.png`, size, true))
            : [],
    ]);

    const manifest = {
        "theme_color": manifestInfo?.themeColor ?? '#000',
        "background_color": manifestInfo?.backgroundColor ?? '#000',
        "display": manifestInfo?.display ?? 'standalone',
        "scope": manifestInfo?.scope ?? '/',
        "start_url": manifestInfo?.startUrl ?? '/',
        "name": manifestInfo?.name ?? '',
        "short_name": manifestInfo?.shortName ?? '',
        "description": manifestInfo?.description ?? '',
        "icons": icons
    };

    await Deno.writeTextFile(manifestStaticFilePath,
        JSON.stringify(manifest, null, 4),
    );

    await Deno.writeTextFile(pwaFilePath, pwaComponentTemplate({ manifestInfo }));
}

if (serviceWorkerInfo !== undefined) {
    await Deno.writeTextFile(serviceWorkerStaticFilePath, serviceWorkerTemplate({
        cacheName: serviceWorkerInfo?.cacheName ?? "",
        workspace,
    }));
}


await Deno.writeTextFile(routesFilePath, routesTemplate(workspace));
await Deno.writeTextFile(endpointsFilePath, endpointsTemplate(workspace));

const cacheDirectoryPath = resolve(`${Deno.env.get("HOME")}/.tano/cache`);
const injectFilePath = join(cacheDirectoryPath, "inject.ts");

await Deno.mkdir(cacheDirectoryPath, { recursive: true });
await Deno.writeTextFile(injectFilePath, injectTemplate());

await esbuild.build({
    plugins: [
        await importMapPlugin({
            importMapFilePath,
        }),
        httpImports(),
        await svgLoaderPlugin(),
    ],
    entryPoints: [ mainTsxFilePath ],
    outfile: rendererFilePath,
    bundle: true,
    format: "esm",
    sourcemap: false,
    splitting: false,
    treeShaking: true,
    minify: true,
    jsxFactory: "createElement",
    jsxFragment: "fragmentType",
    inject: [
        injectFilePath,
    ],
    define: {
        "csr": "false",
        "ssr": "true",
    },
});

esbuild.stop();

await workaroundForAsyncHooks(rendererFilePath, "render", {
    "document": "document",
    "location": "location",
    "navigator": "navigator",
    "setTimeout": "setTimeout",
    "clearTimeout": "clearTimeout",
    "setInterval": "setInterval",
    "clearInterval": "clearInterval",
    "Node": "Node",
    "DocumentFragment": "DocumentFragment",
    "HTMLElement": "HTMLElement",
    "requestAnimationFrame": "requestAnimationFrame",
    "SVGElement": "SVGElement",
});

if (await exists(bundleStaticDirectoryPath)) {
    await Deno.remove(bundleStaticDirectoryPath, { recursive: true });
}

await esbuild.build({
    plugins: [
        await importMapPlugin({
            importMapFilePath,
        }),
        httpImports(),
        await svgLoaderPlugin(),
        await endpointsPlugin({
            routesDirectoryPath,
        }),
    ],
    entryPoints: [ mainTsxFilePath ],
    outdir: buildStaticDirectoryPath,
    bundle: true,
    format: "esm",
    sourcemap: true,
    splitting: true,
    treeShaking: true,
    minify: true,
    jsxFactory: "createElement",
    jsxFragment: "fragmentType",
    entryNames: "bundle",
    chunkNames: "bundle/[hash]",
    inject: [
        injectFilePath,
    ],
    define: {
        "csr": "true",
        "ssr": "false",
    },
});

esbuild.stop();

const walkOptions: WalkOptions = { includeFiles: true, includeDirs: false };

for await(const entry of walk(buildStaticDirectoryPath, walkOptions)) {
    workspace.statics.push(pathToStaticFile(entry.path, buildStaticDirectoryPath));
}

await Deno.writeTextFile(staticsFilePath, staticsTemplate(workspace));
