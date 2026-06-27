// Injected by esbuild's `define` at build time (see esbuild.mjs). The version is
// "<package.json version>+<git short sha>[-dirty]"; the build time is UTC.
declare const TOFIG_VERSION: string;
declare const TOFIG_BUILD_TIME: string;
// React + ReactDOM UMD source, injected into the render iframe so CDN-loading
// runtimes (Claude's dc-runtime) can boot under Figma's networkAccess:none.
declare const TOFIG_REACT_SRC: string;
