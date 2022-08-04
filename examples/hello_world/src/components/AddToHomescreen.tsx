import { Component } from "https://deno.land/x/tano@0.0.1/lib/react.ts";

import { isInstalled } from "$utils/pwa.ts";

// @deno-types="https://deno.land/x/tano@0.0.1/lib/types/svg.d.ts"
import IosShareSvg from "../static/images/ios-share.svg";


export const AddToHomescreen: Component = () => {
    return (navigator.userAgent.indexOf("iPhone") !== -1 && !isInstalled) && (
        <div className="add-to-homescreen">
            <div>
                <div>To install this WebApp on your iPhone</div>
                <div>tap <IosShareSvg/> and then <span className="highlight">Add to Homescreen</span></div>
            </div>
        </div>
    );
};
