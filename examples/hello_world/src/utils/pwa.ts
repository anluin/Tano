export const isInstalled = (
    window.matchMedia
        ?.call(window, '(display-mode: standalone)')
        .matches ?? undefined
);
