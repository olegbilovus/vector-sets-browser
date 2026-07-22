import { NextRequest, NextResponse } from "next/server"
import {
    RedisConnection,
    getRedisUrl,
} from "@/services/redis-server/RedisConnection"
import { vectorToFp32Buffer } from "@/services/redis-server/utils"
import {
    SearchIndexHit,
    SearchIndexSearchRequest,
    SearchIndexSearchResult,
} from "@/lib/types/searchIndex"

const SCORE_ALIAS = "__score"

// POST /api/search-index/[name]/search - KNN vector search over an FT index.
export async function POST(request: NextRequest, { params }: any) {
    const parsed = await params
    if (!parsed?.name) {
        return NextResponse.json(
            { success: false, error: "Index name is required" },
            { status: 400 }
        )
    }
    const name = decodeURIComponent(parsed.name)

    const body = (await request.json()) as SearchIndexSearchRequest
    if (!Array.isArray(body?.vector) || body.vector.length === 0) {
        return NextResponse.json(
            { success: false, error: "A query vector is required" },
            { status: 400 }
        )
    }
    if (!body.vectorField) {
        return NextResponse.json(
            { success: false, error: "vectorField is required" },
            { status: 400 }
        )
    }

    const redisUrl = await getRedisUrl()
    if (!redisUrl) {
        return NextResponse.json(
            { success: false, error: "No Redis connection available" },
            { status: 401 }
        )
    }

    const count = Math.max(1, Math.min(Number(body.count) || 10, 1000))
    const filter = body.filter && body.filter.trim() ? body.filter.trim() : "*"
    const blob = vectorToFp32Buffer(body.vector)

    const query = `(${filter})=>[KNN ${count} @${body.vectorField} $BLOB AS ${SCORE_ALIAS}]`

    const command: (string | Buffer)[] = [
        "FT.SEARCH",
        name,
        query,
        "PARAMS",
        "2",
        "BLOB",
        blob,
        "SORTBY",
        SCORE_ALIAS,
        "ASC",
    ]

    // Only fetch the fields we can display (never the raw vector blob),
    // plus the vector itself when requested (for the visualizations).
    const returnFields = (body.returnFields || []).filter(Boolean)
    const wantVector = body.returnVector === true
    const returnList = [...returnFields, SCORE_ALIAS]
    if (wantVector) returnList.push(body.vectorField)
    command.push("RETURN", String(returnList.length), ...returnList)
    command.push("LIMIT", "0", String(count), "DIALECT", "2")

    const executedCommand = command
        .map((a) => (a instanceof Buffer ? "<binary>" : String(a)))
        .join(" ")

    const response = await RedisConnection.withClient(redisUrl, async (client) => {
        return (await client.sendCommand(command)) as unknown[]
    })

    if (!response.success) {
        // Surface RediSearch query syntax errors distinctly for the UI.
        const msg = response.error || "Search failed"
        const isSyntax = /syntax error|Unknown|argument/i.test(msg)
        return NextResponse.json(
            { success: false, error: msg, isFilterSyntaxError: isSyntax },
            { status: isSyntax ? 422 : 400 }
        )
    }

    const raw = response.result as unknown[]
    const total = Number(raw?.[0]) || 0
    const metric = (body.distanceMetric || "").toUpperCase()

    const hits: SearchIndexHit[] = []
    for (let i = 1; i + 1 < raw.length; i += 2) {
        const id = String(raw[i])
        const fieldArr = (raw[i + 1] as unknown[]) || []
        const fields: Record<string, string> = {}
        let score = 0
        let vector: number[] | undefined
        for (let j = 0; j + 1 < fieldArr.length; j += 2) {
            const key = String(fieldArr[j])
            const val = fieldArr[j + 1]
            if (key === SCORE_ALIAS) {
                score = Number(val) || 0
            } else if (wantVector && key === body.vectorField) {
                // JSON vector fields come back as a flat JSON array string.
                try {
                    const parsed = JSON.parse(String(val))
                    vector = Array.isArray(parsed?.[0]) ? parsed[0] : parsed
                } catch {
                    vector = undefined
                }
            } else {
                fields[key] = val == null ? "" : String(val)
            }
        }
        const similarity = metric === "COSINE" ? 1 - score : null
        hits.push({ id, score, similarity, fields, vector })
    }

    const result: SearchIndexSearchResult = { total, hits }

    return NextResponse.json({
        success: true,
        result,
        executedCommand,
        executionTimeMs: response.executionTimeMs,
    })
}
