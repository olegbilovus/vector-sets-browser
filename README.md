# Vector Sets Browser

> ## About this fork
>
> This is a fork of [redis/vector-sets-browser](https://github.com/redis/vector-sets-browser). It keeps the original
> feature set and adds RediSearch support, a working Docker image, and a build that passes lint and typecheck on
> current Node and dependency versions. The sections below are the upstream README, updated where this fork changed
> the behaviour they describe.
>
> ### Added
>
> - **RediSearch index browsing (read-only).** Vector data indexed with `FT.CREATE ... VECTOR` is browsable alongside
>   native Vector Sets, using `FT._LIST`, `FT.INFO` and KNN `FT.SEARCH`. RediSearch has no `VLINKS` equivalent, so
>   neighbour graphs are rebuilt client-side from KNN results on every view and nothing is ever written back to Redis.
>   Instances without the Query Engine report the feature as unavailable rather than erroring. Title/url/snippet fields
>   are auto-detected and user-overridable, and per-index preferences live in `localStorage`.
> - **Docker images.** `linux/amd64` and `linux/arm64` images are published to
>   `ghcr.io/olegbilovus/vector-sets-browser` from CI on `main` and `v*` tags, each architecture built on a native
>   runner. The image is built around Next.js `output: 'standalone'` and runs as an unprivileged user.
> - **`thenlper/gte-base` local embeddings** via Transformers.js, running in the browser.
> - **`scripts/migrate-to-vectorset.mjs`**, which copies RediSearch documents into a native vector set. It derives
>   prefixes, key type, vector field and dimensions from `FT.INFO`, or takes them from flags; it handles JSON and hash
>   documents, and supports `--dry-run`.
>
> ### Changed
>
> - **Node 24** across the Dockerfile, CI and `.nvmrc`, with an `engines` constraint (upstream targeted Node 18, EOL
>   April 2025).
> - **Dependencies updated** to their latest releases — Next 16, redis 6, openai 6, `@huggingface/transformers`
>   replacing the superseded `@xenova/transformers`, and a flat `eslint.config.mjs`. ESLint stays at 9 and TypeScript at
>   6, both blocked on upstream incompatibilities.
> - **CI runs lint and typecheck as blocking checks.** Both were failing on the upstream tree; roughly 195 lint problems
>   and 30 type errors are resolved. Remaining warnings are React Compiler rules, documented in `eslint.config.mjs`.
>
> ### Fixed
>
> - `docker build` had never succeeded on this repo, masking a broken import in `app/api/jobs/route.ts` that dev mode
>   never compiled.
> - The distribution chart coloured bars by frequency rather than value, which rendered nearly every bar pure black.
> - The 2D graph hardcoded its own height and collapsed to a sliver inside any container with more chrome above it.
> - The optional native `canvas` addon was bundled by webpack, so its absence on Node 24 produced a `MODULE_NOT_FOUND`
>   stack on every start instead of one warning.
> - Vector set discovery ran `SCAN` without `COUNT`, taking ~30 s on a 420k-key database; with `COUNT 1000` the same
>   endpoint returns in ~620 ms. The sidebar also now shows a spinner where the list will appear.
> - `GET /api/jobs` used `KEYS "job:*:status"`, blocking Redis on every 1–5 s poll. Jobs now register in a `job:index`
>   set and listing is a single `SMEMBERS`.
> - Saved Redis connections used the connection URL as their id, so entries sharing a host:port overwrote each other.
>   Ids are now UUIDs, with existing entries reissued once on load.
> - Two components called hooks after early returns, changing hook order between renders once async data arrived.

A modern web-based visualization and interaction tool for Redis Vector Sets. This application provides an intuitive interface for exploring and analyzing vector embeddings stored in Redis vector-sets.

## Overview

Vector Sets Browser is a Next.js application that provides real-time visualization of vector embeddings and their relationships. It features multiple visualization options, the ability to seamlessly tie in an embedding model with several built-in and support for OpenAI and Ollama. Import options and full support for all options for creating and working with Vector Sets.

  
## Prerequisites

- Node.js 24 or later (see `.nvmrc`)
- A Redis server with vector sets ([included in Redis 8](https://hub.docker.com/_/redis))
- (optional) A Redis server with the Query Engine, to browse RediSearch vector indexes
- (optional) OpenAI API key (for AI-assisted imports)
- (optional) Ollama for embedding generation

## Installation

### Clone the repository:
```bash
git clone https://github.com/olegbilovus/vector-sets-browser.git
cd vector-sets-browser
```

## Running with Docker

Pre-built images are published to the GitHub Container Registry on every push to `main`:

```bash
docker run -p 3000:3000 ghcr.io/olegbilovus/vector-sets-browser:latest
```

Or build it yourself using the provided Dockerfile:

1. Build the Docker image:
   ```bash
   docker build -t vector-sets-browser .
   ```

2. Run the Docker container:
   ```bash
   docker run -p 3000:3000 vector-sets-browser
   ```

3. Open your browser and navigate to `http://localhost:3000`. If Redis is running at localhost, you'll need to configure the application to connecto to `host.docker.internal:6379`.

### Using a `.env` File

If you need to configure environment variables, you can create a `.env` file based on the provided `.env.example`. This file can be used to set variables such as `NEXT_PUBLIC_OLLAMA_URL`. It is important if Ollama cannot be reached directly from docker using the default localhost address.

## Running locally

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add your OpenAI API key: `OPENAI_API_KEY=your_api_key_here`

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Features

- **Interactive Visualization**: 2D and 3D visualization of vector embeddings with multiple layout algorithms, plus heatmap, distribution, radial and surface views of individual vectors
- **AI-Assisted CSV Import**: Automatically generate optimal templates for CSV imports using OpenAI
- **Modern UI**: Built with modern React components and Tailwind CSS
- **Flexible Integration**: Works with any vector embeddings stored in Redis vector-sets
- **RediSearch Browsing**: Read-only exploration of vector data indexed with `FT.CREATE ... VECTOR` (added by this fork)

## Technology Stack

- Next.js 16
- React 19
- Three.js (via React Three Fiber) for visualization
- Transformers.js (`@huggingface/transformers`, for built-in embedding models)
- Redis vector sets (part of Redis v8), via `node-redis` 6
- Tailwind CSS 4 for styling
- `ml-pca` for dimensionality reduction

## Redis Vector Sets Integration

This browser requires a Redis instance running with vector sets. Vector sets provide high-performance vector similarity search capabilities. Make sure you have the latest version installed as it includes important features like:

- Proper node deletion with relinking
- 8-bit and binary quantization
- Threaded queries
- Filtered search with predicate callbacks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
