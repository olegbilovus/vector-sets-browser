/** @type {import('next').NextConfig} */
const nextConfig = {
    // Indicate that these packages should not be bundled by webpack.
    // All three are native addons — bundling them turns a clean "not installed"
    // into a webpack module-resolution failure with an unreadable stack.
    serverExternalPackages:  ['sharp', 'onnxruntime-node', 'canvas'],

    // Emit a self-contained server bundle so the Docker runtime stage only
    // needs the traced subset of node_modules instead of the whole tree.
    output: 'standalone',

    // Lint and typecheck are enforced by their own CI jobs (`npm run lint`,
    // `npm run typecheck`) rather than by the production build. SWC strips
    // types without checking them, so neither affects the emitted output —
    // gating the image on them only means a stylistic warning breaks the build.
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
