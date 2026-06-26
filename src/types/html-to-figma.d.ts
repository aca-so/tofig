// The package ships types but its package.json "exports" map doesn't expose a
// types condition, so the bundler resolver can't see them. We cast the result to
// our own LayerNode anyway, so a minimal ambient declaration is enough.
declare module "@builder.io/html-to-figma" {
  export function htmlToFigma(
    selector?: HTMLElement | string,
    useFrames?: boolean,
    time?: boolean
  ): any[];
}
