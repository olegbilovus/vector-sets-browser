import { NextResponse } from "next/server"
import {
    RedisConnection,
    getRedisUrl,
} from "@/services/redis-server/RedisConnection"

// GET /api/search-index - list RediSearch (FT) indexes.
// Returns { available, indexes }. `available` is false when the Redis Query
// Engine module isn't loaded (FT._LIST unknown), so the UI can explain rather
// than show an error.
export async function GET() {
    const redisUrl = await getRedisUrl()
    if (!redisUrl) {
        return NextResponse.json(
            { success: false, error: "No Redis connection available" },
            { status: 401 }
        )
    }

    const response = await RedisConnection.withClient(redisUrl, async (client) => {
        try {
            const list = (await client.sendCommand(["FT._LIST"])) as string[]
            return { available: true, indexes: list.map(String).sort() }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            // Unknown command => module not present. Treat as "no indexes".
            if (/unknown command/i.test(msg)) {
                return { available: false, indexes: [] as string[] }
            }
            throw error
        }
    })

    if (!response.success) {
        return NextResponse.json(
            { success: false, error: response.error },
            { status: 500 }
        )
    }

    return NextResponse.json({
        success: true,
        result: response.result,
        executionTimeMs: response.executionTimeMs,
    })
}
