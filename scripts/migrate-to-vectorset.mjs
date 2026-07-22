// Copy vectors that already live in Redis into a native Vector Set, so the
// vector-sets-browser app can browse them.
//
// Nothing is re-embedded — vectors are read from the source documents as they
// are. Sources can be JSON documents (ReJSON) or hashes, discovered either
// from an existing RediSearch index or from a plain key prefix.
//
// Usage (run from the project root so the `redis` package resolves):
//
//   # Derive everything from a RediSearch index (prefix, key type, vector
//   # field and dimensions all come from FT.INFO):
//   node scripts/migrate-to-vectorset.mjs --index my-index
//
//   # Or point at keys directly:
//   node scripts/migrate-to-vectorset.mjs --prefix "doc:" --vector-field embedding
//
// Options:
//   --index <name>        RediSearch index to read the layout from
//   --prefix <str>        Key prefix to scan (repeatable; implied by --index)
//   --target <name>       Vector set to write (default: derived from source)
//   --vector-field <f>    Field/JSON path holding the vector (default: embedding)
//   --id-field <f>        Field used as the element id (default: the key name)
//   --attrs <a,b,c>       Fields to copy into element attributes
//                         ("all" copies everything except the vector)
//   --key-type <t>        json | hash (default: auto-detected)
//   --dim <n>             Expected dimensions (default: read from first doc)
//   --quant <q>           Q8 | NOQUANT | BIN (default: Q8)
//   --limit <n>           Stop after n documents
//   --batch <n>           Keys per SCAN batch (default: 500)
//   --text-max <n>        Truncate string attributes to n chars (default: 1200)
//   --dry-run             Report what would happen, write nothing
//   --redis-url <url>     Defaults to $REDIS_URL or redis://localhost:6379
//
// Re-running is safe: VADD with the same element id updates it in place.

import { createClient } from "redis"

// ---------------------------------------------------------------- arg parsing

function parseArgs(argv) {
    const opts = { prefix: [] }
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (!a.startsWith("--")) continue
        const key = a.slice(2)
        if (key === "dry-run") {
            opts["dry-run"] = true
            continue
        }
        const value = argv[++i]
        if (value === undefined) throw new Error(`Missing value for --${key}`)
        if (key === "prefix") opts.prefix.push(value)
        else opts[key] = value
    }
    return opts
}

const args = parseArgs(process.argv.slice(2))

const REDIS_URL =
    args["redis-url"] || process.env.REDIS_URL || "redis://localhost:6379"
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity
const BATCH = args.batch ? parseInt(args.batch, 10) : 500
const TEXT_MAX = args["text-max"] ? parseInt(args["text-max"], 10) : 1200
const QUANT = (args.quant || "Q8").toUpperCase()
const DRY_RUN = Boolean(args["dry-run"])

// ------------------------------------------------------------------- helpers

// FT.INFO comes back as a flat [k, v, ...] array on node-redis v4 and as a
// keyed object on v5+. Same for the nested definition and attribute entries.
function asObj(v) {
    if (Array.isArray(v)) {
        const o = {}
        for (let i = 0; i + 1 < v.length; i += 2) o[String(v[i])] = v[i + 1]
        return o
    }
    return v && typeof v === "object" ? v : {}
}

function truncate(v) {
    if (typeof v !== "string") return v
    return v.length > TEXT_MAX ? v.slice(0, TEXT_MAX) : v
}

// Vectors may be a JSON array, an array nested one level (JSONPath results),
// a comma/space separated string, or a raw FP32 buffer from a hash.
function coerceVector(raw) {
    if (raw == null) return null
    if (Array.isArray(raw)) {
        return Array.isArray(raw[0]) ? raw[0].map(Number) : raw.map(Number)
    }
    if (Buffer.isBuffer(raw)) {
        const out = new Array(Math.floor(raw.length / 4))
        for (let i = 0; i < out.length; i++) out[i] = raw.readFloatLE(i * 4)
        return out
    }
    if (typeof raw === "string") {
        const s = raw.trim()
        if (s.startsWith("[")) {
            try {
                return coerceVector(JSON.parse(s))
            } catch {
                return null
            }
        }
        const parts = s.split(/[,\s]+/).filter(Boolean).map(Number)
        return parts.length && parts.every((n) => Number.isFinite(n))
            ? parts
            : null
    }
    return null
}

// ------------------------------------------------------- source configuration

// Read prefix, key type, vector field and dimensions straight off an index.
async function sourceFromIndex(client, indexName) {
    const info = asObj(await client.sendCommand(["FT.INFO", indexName]))
    const def = asObj(info["index_definition"])
    const prefixes = (def["prefixes"] || []).map(String).filter(Boolean)
    const keyType = String(def["key_type"] || "HASH").toLowerCase()

    const attrs = (info["attributes"] || []).map(asObj)
    const vec = attrs.find((a) => String(a["type"]).toUpperCase() === "VECTOR")
    if (!vec) throw new Error(`Index "${indexName}" has no VECTOR field`)

    return {
        prefixes: prefixes.length ? prefixes : [""],
        keyType: keyType.includes("json") ? "json" : "hash",
        // For JSON indexes the identifier is a JSONPath like "$.embedding".
        vectorField: String(vec["identifier"] || vec["attribute"]).replace(
            /^\$\./,
            ""
        ),
        dim: Number(vec["dim"]) || undefined,
        fields: attrs
            .map((a) => String(a["attribute"]))
            .filter((f) => f && f !== String(vec["attribute"])),
    }
}

async function detectKeyType(client, key) {
    const t = String(await client.sendCommand(["TYPE", key])).toLowerCase()
    return t.includes("json") ? "json" : "hash"
}

// ------------------------------------------------------------- document reads

async function readDoc(client, key, keyType) {
    if (keyType === "json") {
        const raw = await client.sendCommand(["JSON.GET", key])
        if (!raw) return null
        try {
            return JSON.parse(raw)
        } catch {
            return null
        }
    }
    return asObj(await client.sendCommand(["HGETALL", key]))
}

// -------------------------------------------------------------- the migration

async function migrate(client, source) {
    const { prefixes, keyType, vectorField, target, idField, attrFields } =
        source
    let expectedDim = source.dim

    let scanned = 0
    let added = 0
    let skipped = 0
    const reasons = new Map()
    const note = (why) => {
        skipped++
        reasons.set(why, (reasons.get(why) || 0) + 1)
    }
    const start = Date.now()

    outer: for (const prefix of prefixes) {
        let cursor = "0"
        do {
            const cmd = ["SCAN", cursor, "COUNT", String(BATCH)]
            if (prefix) cmd.push("MATCH", `${prefix}*`)
            cmd.push("TYPE", keyType === "json" ? "ReJSON-RL" : "hash")

            const [next, keys] = await client.sendCommand(cmd)
            cursor = next
            if (!keys.length) continue

            const docs = await Promise.all(
                keys.map((k) => readDoc(client, k, keyType))
            )

            const cmds = []
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i]
                if (!doc) {
                    note("unreadable")
                    continue
                }

                const vector = coerceVector(doc[vectorField])
                if (!vector || !vector.length) {
                    note(`no "${vectorField}" field`)
                    continue
                }
                if (!expectedDim) expectedDim = vector.length
                if (vector.length !== expectedDim) {
                    note(`dimension mismatch (want ${expectedDim})`)
                    continue
                }
                if (!vector.every((n) => Number.isFinite(n))) {
                    note("non-finite values")
                    continue
                }

                const element = String((idField && doc[idField]) || keys[i])

                const vadd = ["VADD", target, "VALUES", String(expectedDim)]
                for (const v of vector) vadd.push(String(v))
                vadd.push(element)

                const attrs = {}
                const wanted =
                    attrFields === "all"
                        ? Object.keys(doc).filter((k) => k !== vectorField)
                        : attrFields
                for (const f of wanted) {
                    if (doc[f] !== undefined) attrs[f] = truncate(doc[f])
                }
                if (Object.keys(attrs).length) {
                    vadd.push("SETATTR", JSON.stringify(attrs))
                }
                if (QUANT !== "NOQUANT") vadd.push(QUANT)

                cmds.push(vadd)
            }

            if (!DRY_RUN) {
                await Promise.all(cmds.map((c) => client.sendCommand(c)))
            }
            added += cmds.length
            scanned += keys.length

            if (added > 0 && added % 5000 < BATCH) {
                const rate = Math.round(added / ((Date.now() - start) / 1000))
                console.log(
                    `  [${target}] ${added} added, ${skipped} skipped ~${rate}/s`
                )
            }
            if (scanned >= LIMIT) break outer
        } while (cursor !== "0")
    }

    const secs = Math.round((Date.now() - start) / 1000)
    const detail = reasons.size
        ? ` [${[...reasons].map(([k, v]) => `${v} ${k}`).join(", ")}]`
        : ""

    if (DRY_RUN) {
        console.log(
            `~ ${target}: would add ${added}, skip ${skipped}${detail} (dry run, ${secs}s)`
        )
        return
    }

    const card = await client.sendCommand(["VCARD", target])
    console.log(
        `✓ ${target}: VCARD=${card} (added ${added}, skipped ${skipped}${detail}) in ${secs}s`
    )
}

// ----------------------------------------------------------------------- main

async function main() {
    if (!args.index && !args.prefix.length) {
        console.error(
            "Nothing to migrate. Pass --index <name> or --prefix <str>.\n" +
                "See the header of this file for all options."
        )
        process.exit(1)
    }

    const client = createClient({ url: REDIS_URL })
    client.on("error", (e) => console.error("Redis error:", e.message))
    await client.connect()
    console.log(
        `Connected to ${REDIS_URL}${DRY_RUN ? " (dry run)" : ""}. ` +
            `limit=${LIMIT === Infinity ? "all" : LIMIT} quant=${QUANT}`
    )

    let source
    if (args.index) {
        source = await sourceFromIndex(client, args.index)
        console.log(
            `Index "${args.index}": ${source.keyType.toUpperCase()} keys, ` +
                `prefixes ${JSON.stringify(source.prefixes)}, ` +
                `vector "${source.vectorField}"` +
                (source.dim ? ` (${source.dim}d)` : "")
        )
    } else {
        source = { prefixes: args.prefix, fields: [] }
    }

    // Explicit flags always win over anything derived from the index.
    if (args["vector-field"]) source.vectorField = args["vector-field"]
    if (args["key-type"]) source.keyType = args["key-type"].toLowerCase()
    if (args.dim) source.dim = parseInt(args.dim, 10)
    source.vectorField = source.vectorField || "embedding"
    source.idField = args["id-field"] || null

    if (!source.keyType) {
        // Peek at one key so --prefix users need not care about the type.
        const [, keys] = await client.sendCommand([
            "SCAN",
            "0",
            "MATCH",
            `${source.prefixes[0]}*`,
            "COUNT",
            "100",
        ])
        source.keyType = keys.length
            ? await detectKeyType(client, keys[0])
            : "hash"
        console.log(`Detected ${source.keyType.toUpperCase()} keys`)
    }

    source.attrFields =
        args.attrs === "all"
            ? "all"
            : args.attrs
              ? args.attrs.split(",").map((s) => s.trim()).filter(Boolean)
              : source.fields || []

    source.target =
        args.target ||
        args.index ||
        source.prefixes[0].replace(/[:*]+$/, "") ||
        "vectorset"

    console.log(`\nMigrating -> vector set "${source.target}" ...`)
    await migrate(client, source)

    await client.quit()
    console.log("\nDone.")
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
