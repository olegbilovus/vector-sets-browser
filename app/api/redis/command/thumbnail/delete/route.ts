import { NextResponse } from 'next/server'
import { RedisConnection, getRedisUrl } from '@/lib/redis-server/RedisConnection'
import { validateRequest, handleError } from '@/lib/redis-server/utils'

interface ThumbnailDeleteRequest {
    key: string
}

function validateThumbnailDeleteRequest(body: any): { isValid: boolean; error?: string; value?: ThumbnailDeleteRequest } {
    if (!body.key || typeof body.key !== 'string') {
        return { isValid: false, error: 'Key is required and must be a string' }
    }

    return {
        isValid: true,
        value: {
            key: body.key
        }
    }
}

export async function DELETE(request: Request) {
    try {
        // Validate request
        const validatedRequest = await validateRequest(request, validateThumbnailDeleteRequest)
        
        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        // Delete thumbnail from Redis
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            // Delete the thumbnail hash
            const result = await client.del(validatedRequest.key)
            return result > 0 // Returns true if key was deleted, false if it didn't exist
        })

        if (!redisResult.success) {
            return NextResponse.json({
                success: false,
                error: redisResult.error || 'Failed to delete thumbnail'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            deleted: redisResult.result,
            message: redisResult.result ? 'Thumbnail deleted successfully' : 'Thumbnail not found'
        })

    } catch (error) {
        return handleError(error)
    }
}
