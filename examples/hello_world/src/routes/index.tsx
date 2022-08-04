import { Component, Effect } from "https://deno.land/x/tano@0.0.2/src/lib/react.ts";
import { CounterSection } from "$components/CounterSection.tsx";

import { hello } from "./hello/index.ts";


export const render: Component = () => {
    const $visibility = new Effect(false);

    const handleClick = () => {
        $visibility.update(x => !x);
    };

    return (
        <>
            <section>
                {hello()}
            </section>
            <section>
                <button onClick={handleClick}>Toggle</button>
            </section>
            {$visibility.map(visibility => visibility && (
                <CounterSection/>
            ))}
        </>
    );
};
