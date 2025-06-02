import { NextResponse } from 'next/server'
import { RedisConnection, getRedisUrl } from '@/lib/redis-server/RedisConnection'
import { handleError } from '@/lib/redis-server/utils'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const key = searchParams.get('key')

        if (!key) {
            return NextResponse.json(
                { success: false, error: 'Key parameter is required' },
                { status: 400 }
            )
        }

        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        // Retrieve thumbnail data from Redis
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            // Get the thumbnail data hash
            const thumbnailData = await client.hGetAll(key)
            
            if (!thumbnailData || Object.keys(thumbnailData).length === 0) {
                return null
            }
            
            return thumbnailData
        })

        if (!redisResult.success) {
            return NextResponse.json({
                success: false,
                error: redisResult.error || 'Failed to retrieve thumbnail'
            }, { status: 500 })
        }

        if (!redisResult.result) {
            return NextResponse.json({
                success: false,
                error: 'Thumbnail not found'
            }, { status: 404 })
        }

        const thumbnailData = redisResult.result
        
        // Validate that we have the required fields
        if (!thumbnailData.data || !thumbnailData.mimeType) {
            return NextResponse.json({
                success: false,
                error: 'Invalid thumbnail data format'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: {
                data: thumbnailData.data,
                mimeType: thumbnailData.mimeType,
                createdAt: thumbnailData.createdAt,
                size: thumbnailData.size ? parseInt(thumbnailData.size) : undefined
            }
        })

    } catch (error) {
        return handleError(error)
    }
}
