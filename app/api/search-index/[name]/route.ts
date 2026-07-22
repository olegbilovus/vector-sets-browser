import { NextRequest, NextResponse } from "next/server"
import {
    RedisConnection,
    getRedisUrl,
} from "@/services/redis-server/RedisConnection"
import { parseFtInfo } from "@/lib/server/redis/ftInfo"

// GET /api/search-index/[name] - parsed FT.INFO for one index.
export async function GET(_request: NextRequest, { params }: any) {
    const parsed = await params
    if (!parsed?.name) {
        return NextResponse.json(
            { success: false, error: "Index name is required" },
            { status: 400 }
        )
    }
    const name = decodeURIComponent(parsed.name)

    const redisUrl = await getRedisUrl()
    if (!redisUrl) {
        return NextResponse.json(
            { success: false, error: "No Redis connection available" },
            { status: 401 }
        )
    }

    const response = await RedisConnection.withClient(redisUrl, async (client) => {
        const raw = (await client.sendCommand(["FT.INFO", name])) as unknown[]
        return parseFtInfo(name, raw)
    })

    if (!response.success) {
        return NextResponse.json(
            { success: false, error: response.error },
            { status: 404 }
        )
    }

    return NextResponse.json({
        success: true,
        result: response.result,
        executionTimeMs: response.executionTimeMs,
    })
}
