import { Component, Effect } from "https://deno.land/x/tano@0.0.2/src/lib/react.ts";


export const CounterSection: Component = () => {
    const counter = new Effect(0);
    let intervalHandle: number | undefined;

    const handleMount = () => {
        intervalHandle = setInterval(() => {
            counter.update(value => value + 1);
        }, 1000);
    };

    const handleCleanup = () => {
        clearInterval(intervalHandle);
    };

    return (
        <section onMount={handleMount} onCleanup={handleCleanup}>
            Counter:
            <pre style="display: inline; padding: 0 8px;">
                {counter}
            </pre>
        </section>
    );
};
