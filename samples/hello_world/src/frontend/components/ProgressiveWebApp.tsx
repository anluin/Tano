import { Component, isInstalled, Skip } from "https://deno.land/x/tano@0.0.14/lib/frontend.ts";


export type Properties = {
    themeColor: string,
    description: string,
};

export const ProgressiveWebApp: Component<Properties> = (properties: Properties) => {
    const { themeColor, description } = properties;

    return (
        <>
            <meta name="theme-color" content={themeColor}/>
            <meta name="description" content={description}/>
            {(
                isInstalled()
                    ? <meta name="viewport" content={[
                        "width=device-width",
                        "initial-scale=1.0",
                        "maximum-scale=1.0",
                        "viewport-fit=cover",
                        "user-scalable=no",
                    ].join()}/>
                    : <meta name="viewport" content="width=device-width"/>
            )}
            {csr ? <Skip/> : (
                <>
                    <link rel="manifest" href="/manifest.json"/>
                    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
                    <meta name="apple-mobile-web-app-capable" content="yes"/>

                    <link rel="apple-touch-icon" href="/icons/icon-maskable-192x192.png"/>
                    <link rel="apple-touch-icon" href="/icons/icon-maskable-256x256.png"/>
                    <link rel="apple-touch-icon" href="/icons/icon-maskable-384x384.png"/>
                    <link rel="apple-touch-icon" href="/icons/icon-maskable-512x512.png"/>

                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/2224x1668.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
                          href="/images/splash_screens/2556x1179.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                          href="/images/splash_screens/1170x2532.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/1536x2048.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                          href="/images/splash_screens/1242x2688.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/750x1334.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/2360x1640.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/2160x1620.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/640x1136.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/1136x640.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
                          href="/images/splash_screens/2778x1284.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/1792x828.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                          href="/images/splash_screens/1125x2436.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/2388x1668.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
                          href="/images/splash_screens/2532x1170.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
                          href="/images/splash_screens/2208x1242.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/2048x2732.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/1668x2224.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/1620x2160.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                          href="/images/splash_screens/1242x2208.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
                          href="/images/splash_screens/2436x1125.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
                          href="/images/splash_screens/2796x1290.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/1668x2388.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                          href="/images/splash_screens/1179x2556.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                          href="/images/splash_screens/1284x2778.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/828x1792.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                          href="/images/splash_screens/1640x2360.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
                          href="/images/splash_screens/2688x1242.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                          href="/images/splash_screens/1290x2796.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/1334x750.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/2048x1536.png"/>
                    <link rel="apple-touch-startup-image"
                          media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
                          href="/images/splash_screens/2732x2048.png"/>
                    <script async src="/serviceWorker.js"/>
                </>
            )}
        </>
    );
};
