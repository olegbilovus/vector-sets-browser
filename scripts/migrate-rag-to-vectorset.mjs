// Migrate a RediSearch (FT + ReJSON) RAG into native Redis Vector Sets
// so the vector-sets-browser app can browse it.
//
// The embeddings already exist in each JSON doc, so nothing is re-embedded.
//
// Usage (run from the project root so the `redis` package resolves):
//   node scripts/migrate-rag-to-vectorset.mjs            # full migration
//   LIMIT=200 node scripts/migrate-rag-to-vectorset.mjs  # quick test (200 docs/index)
//   REDIS_URL=redis://localhost:6379 node scripts/migrate-rag-to-vectorset.mjs
//
// Re-running is safe: VADD with the same element id updates it in place.

import { createClient } from "redis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity
const BATCH = 500
const DIM = 768
const QUANT = "Q8" // quantization to keep memory down; drop for exact vectors
const TEXT_ATTR_MAX = 1200 // chars of chunk text kept in element attributes

// Which indexes to migrate -> which vector set name to create.
const JOBS = [
    { prefix: "servicenowdoc:zurich:", target: "servicenow-zurich", release: "zurich" },
    { prefix: "servicenowdoc:australia:", target: "servicenow-australia", release: "australia" },
]

function buildAttrs(o) {
    const text = typeof o.text === "string" ? o.text.slice(0, TEXT_ATTR_MAX) : ""
    return JSON.stringify({
        title: o.title ?? "",
        url: o.canonical_url ?? "",
        breadcrumb: o.breadcrumb ?? "",
        product: o.product ?? "",
        release: o.release ?? "",
        content_type: o.content_type ?? "",
        file: o.file ?? "",
        description: o.description ?? "",
        text,
    })
}

async function migrateJob(client, job) {
    let cursor = "0"
    let scanned = 0
    let added = 0
    let skipped = 0
    const start = Date.now()

    do {
        const [next, keys] = await client.sendCommand([
            "SCAN", cursor, "MATCH", `${job.prefix}*`, "TYPE", "ReJSON-RL", "COUNT", String(BATCH),
        ])
        cursor = next
        if (keys.length === 0) continue

        // Fetch all docs in this batch in one pipeline
        const docs = await Promise.all(
            keys.map((k) => client.sendCommand(["JSON.GET", k]))
        )

        const cmds = []
        for (const raw of docs) {
            if (!raw) { skipped++; continue }
            let o
            try { o = JSON.parse(raw) } catch { skipped++; continue }

            const vec = o.embedding
            const element = o.id
            if (!Array.isArray(vec) || vec.length !== DIM || !element) { skipped++; continue }

            const cmd = ["VADD", job.target, "VALUES", String(DIM)]
            for (const v of vec) cmd.push(v.toString())
            cmd.push(element, "SETATTR", buildAttrs(o), QUANT)
            cmds.push(cmd)
        }

        // Pipeline the VADDs for this batch
        await Promise.all(cmds.map((c) => client.sendCommand(c)))
        added += cmds.length
        scanned += keys.length

        if (scanned >= LIMIT) break
        if (added % 5000 < BATCH) {
            const rate = Math.round(added / ((Date.now() - start) / 1000))
            console.log(`  [${job.target}] added ${added} (skipped ${skipped}) ~${rate}/s`)
        }
    } while (cursor !== "0")

    // Record metadata so the app shows the set with its dimensions.
    const now = new Date().toISOString()
    const metadata = {
        // gte-base (Transformers.js) matches the snow-mcp-java ETL, so text-query
        // search embeds comparably. Change to { provider: "none", ... } to disable.
        embedding: { provider: "clip", clip: { model: "gte-base" } },
        dimensions: DIM,
        created: now,
        lastUpdated: now,
        description: `Migrated from RediSearch RAG (prefix ${job.prefix})`,
        redisConfig: { quantization: QUANT },
    }
    await client.hSet("vector-set-browser:config", {
        [`vset:${job.target}:metadata`]: JSON.stringify(metadata),
    })

    const card = await client.sendCommand(["VCARD", job.target])
    console.log(`✓ ${job.target}: VCARD=${card} (added ${added}, skipped ${skipped}) in ${Math.round((Date.now() - start) / 1000)}s`)
}

async function main() {
    const client = createClient({ url: REDIS_URL })
    client.on("error", (e) => console.error("Redis error:", e.message))
    await client.connect()
    console.log(`Connected to ${REDIS_URL}. LIMIT=${LIMIT === Infinity ? "all" : LIMIT}`)

    for (const job of JOBS) {
        console.log(`\nMigrating ${job.prefix} -> vectorset "${job.target}" ...`)
        await migrateJob(client, job)
    }

    await client.quit()
    console.log("\nDone.")
}

main().catch((e) => { console.error(e); process.exit(1) })
