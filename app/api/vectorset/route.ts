import { NextResponse } from "next/server"
import {
    RedisConnection,
    getRedisUrl,
} from "@/services/redis-server/RedisConnection"

// GET /api/vectorset - List all vector sets (scanVectorSets)

export async function GET() {
    const redisUrl = await getRedisUrl()
    if (!redisUrl) {
        return NextResponse.json(
            { success: false, error: "No Redis connection available" },
            { status: 401 }
        )
    }

    try {
        const response = await RedisConnection.withClient(redisUrl, async (client) => {
            try {
                let cursor = "0"
                const vectorSets = new Set<string>()

                do {
                    // COUNT is a hint for how many keys Redis examines per
                    // call, not how many it returns. Without it Redis defaults
                    // to 10, so a keyspace with a few hundred thousand keys
                    // needs tens of thousands of round trips — on a remote
                    // server that is tens of seconds. Vector sets are rare
                    // relative to total keys, so scanning in large batches
                    // costs one cheap server-side pass and far fewer hops.
                    const [nextCursor, keys] = (await client.sendCommand([
                        "SCAN",
                        cursor,
                        "TYPE",
                        "vectorset",
                        "COUNT",
                        "1000",
                    ])) as [string, string[]]

                    keys.forEach((key) => vectorSets.add(key))
                    cursor = nextCursor
                } while (cursor !== "0")

                return Array.from(vectorSets)
            } catch (_error) {
                return []
            }
        })

        if (!response || !response.success) {
            return NextResponse.json(
                { success: false, error: "Error calling scanVectorSets" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            result: response.result,
            executionTimeMs: response.executionTimeMs,
        })

    } catch (error) {
        console.error("Error in scanVectorSets API (GET):", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}
