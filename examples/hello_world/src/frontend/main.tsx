import { ComponentInitializer, MouseEventListener, render, Signal } from "https://deno.land/x/tano/lib/frontend/mod.ts";

import { api } from "../shared/api.ts";

import "./main.css";


const $counter = new Signal(0);
const $toggle = new Signal(true);
const $response = new Signal(await api.random({ shouldFail: false }));


const TestWithSignalizedProperties: ComponentInitializer<{
    onClick?: MouseEventListener,
}> = function () {
    const { $children, $onClick } = this.properties;

    console.log("TestWithSignalizedProperties", "initialized");

    return (
        <button onClick={$onClick}>
            {$children}
        </button>
    );
};
const TestWithoutSignalizedProperties: ComponentInitializer<{
    onClick?: MouseEventListener,
}> = function ({ children, onClick }) {
    console.log("TestWithoutSignalizedProperties", "initialized");

    return (
        <button onClick={onClick}>
            {children}
        </button>
    );
};

await render(() => (
    <html lang="en">
        <head>
            <title>Hello, world!</title>
            <link rel="stylesheet" href="/bundle.css"/>
        </head>
        <body>
            <section>
                <h1>Signals</h1>
                <pre>
                    {$counter}
                </pre>
                <pre>
                    {$counter} % 2 = ${$counter.map(value => value % 2)}
                </pre>
                <form onSubmit={event => event.preventDefault()}>
                    <button onClick={() => $counter.update(value => value + 1)}>
                        Increment
                    </button>
                    <button onClick={() => $counter.update(value => value - 1)}>
                        Decrement
                    </button>
                </form>
            </section>
            <section>
                <h1>APIs</h1>
                <pre>
                    {$response.map(JSON.stringify)}
                </pre>
                <form onSubmit={event => event.preventDefault()}>
                    <button onClick={async () => $response.set(await api.random({ shouldFail: false }))}>
                        Should not fail!
                    </button>
                    <button onClick={async () => $response.set(await api.random({ shouldFail: true }))}>
                        Should fail!
                    </button>
                </form>
            </section>
            <section>
                <h1>Signalized Properties</h1>
                <p>
                    If a Component uses the "signalized properties api",<br/>
                    new properties will be passed into the signals instead of re-initializing the component.
                </p>
                <pre>
                    {$toggle.map(toggle => toggle ? (
                        <>
                            <TestWithSignalizedProperties onClick={() => alert("test")}>
                                Click me!
                            </TestWithSignalizedProperties>
                            <TestWithoutSignalizedProperties onClick={() => alert("test")}>
                                Click me!
                            </TestWithoutSignalizedProperties>
                        </>
                    ) : (
                        <>
                            <TestWithSignalizedProperties>
                                Swapped
                            </TestWithSignalizedProperties>
                            <TestWithoutSignalizedProperties>
                                Swapped
                            </TestWithoutSignalizedProperties>
                        </>
                    ))}
                </pre>
                <form onSubmit={event => event.preventDefault()}>
                    <button onClick={() => $toggle.update(value => !value)}>
                        Click me!
                    </button>
                </form>
            </section>
        </body>
    </html>
));
