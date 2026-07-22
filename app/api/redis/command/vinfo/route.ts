import { RedisConnection, getRedisUrl } from '@/services/redis-server/RedisConnection'
import { validateRequest, formatResponse, handleError } from '@/services/redis-server/utils'
import { validateVinfoRequest, buildVinfoCommand } from './command'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // Validate request
        const validatedRequest = await validateRequest(request, validateVinfoRequest)
        
        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        // Build command
        const commands = buildVinfoCommand(validatedRequest)
        const commandStr = commands[0].join(' ')

        // If returnCommandOnly is true, return just the command
        if (validatedRequest.returnCommandOnly) {
            return NextResponse.json({
                success: true,
                executedCommand: commandStr
            })
        }

        // Execute command
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            return await client.sendCommand(commands[0])
        })

        // Check if the Redis operation itself failed
        if (!redisResult.success) {
            return formatResponse(redisResult)
        }

        // Process VINFO result.
        // node-redis v4 returns alternating [key, value, ...]; v5+ decodes the
        // reply into a keyed object. Normalise to pairs before converting.
        const raw = redisResult.result as unknown
        const pairs: Array<[string, unknown]> = Array.isArray(raw)
            ? Array.from({ length: Math.floor(raw.length / 2) }, (_, i) => [
                  String(raw[i * 2]),
                  raw[i * 2 + 1],
              ])
            : Object.entries((raw as Record<string, unknown>) || {})

        const info: Record<string, any> = {}
        for (const [key, value] of pairs) {
            if (key && value !== undefined) {
                // Convert numeric strings to numbers
                if (typeof value === 'string' && !isNaN(Number(value))) {
                    info[key] = Number(value)
                } else {
                    info[key] = value
                }
            }
        }

        return formatResponse({
            success: true,
            result: info,
            executedCommand: commandStr
        })
    } catch (error) {
        return handleError(error)
    }
}

// Also support GET requests for compatibility
export async function GET(request: Request) {
    const url = new URL(request.url)
    const keyName = url.searchParams.get("key")

    // Convert the GET request to a POST request format
    const postRequest = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({ keyName })
    })

    return POST(postRequest)
}
