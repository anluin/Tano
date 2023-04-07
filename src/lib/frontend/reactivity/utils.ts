import { ComputedSignal, ReadonlySignal, Signal } from "./signal.ts";
import { Context } from "./context.ts";
import { Effect } from "./effect.ts";


export type Normalized<T> = T extends ReadonlySignal<infer I> ? I : T;

export type ClassList = (string | undefined | ReadonlySignal<string | undefined> | Record<string, boolean | undefined | ReadonlySignal<boolean | undefined>> | ClassList)[];

export const globalContext = new Context();
export const useContext = <T>(context: Context | undefined, callback: () => T): T => {
    const previousContext = Context._current;
    Context._current = context;
    const result = callback();
    Context._current = previousContext;
    return result;
};

export const useEffects = <T>(effect: Effect | undefined, callback: () => T): T => {
    const previousEffect = Effect._current;
    Effect._current = effect;
    const result = useContext(effect?._context, callback);
    Effect._current = previousEffect;
    return result;
};

export const preventEffects = <T>(callback: () => T): T =>
    useEffects(undefined, callback);

export const computed = <T>(callback: () => T, context?: Context): ReadonlySignal<T> =>
    new ComputedSignal(callback, context);

export const normalize = <T>(value: T): Normalized<T> =>
    value instanceof ReadonlySignal ? value.get() : value;

export const createSignalFromMediaQuery = (
    (cache: Record<string, Signal<boolean>> = {}) =>
        (query: string, ssr = false): Signal<boolean> => {
            if (cache[query]) return cache[query];

            if (csr) {
                const mediaQueryList = window.matchMedia(query);
                const $value = new Signal(mediaQueryList.matches);

                mediaQueryList.addEventListener("change", (event) => {
                    $value.set(event.matches);
                });

                return cache[query] = $value;
            } else {
                return cache[query] = new Signal(ssr);
            }
        }
)();


export const processClassList = (classList: ClassList): string[] => (
    classList.reduce<string[]>(
        (carry, element) => {
            if (element instanceof ReadonlySignal) {
                element = normalize(element);
            }

            if (element instanceof Array) {
                return [
                    ...carry,
                    ...processClassList(element),
                ];
            }

            if (typeof element === "string") {
                return [ ...carry, ...element.split(" ") ];
            }

            if (typeof element === "object") {
                return [
                    ...carry,
                    ...Object.entries(element)
                        .reduce<string[]>((carry, [ key, value ]) => (
                            normalize(value) ? [ ...carry, key ] : carry
                        ), []),
                ];
            }

            return carry;
        },
        [],
    )
);

export const $isInstalled = createSignalFromMediaQuery("(display-mode: standalone)", false);
