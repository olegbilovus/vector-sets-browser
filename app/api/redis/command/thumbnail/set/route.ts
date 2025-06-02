import { NextResponse } from 'next/server'
import { RedisConnection, getRedisUrl } from '@/lib/redis-server/RedisConnection'
import { validateRequest, handleError } from '@/lib/redis-server/utils'

interface ThumbnailSetRequest {
    key: string
    data: string // base64 encoded image data
    mimeType: string
}

function validateThumbnailSetRequest(body: any): { isValid: boolean; error?: string; value?: ThumbnailSetRequest } {
    if (!body.key || typeof body.key !== 'string') {
        return { isValid: false, error: 'Key is required and must be a string' }
    }

    if (!body.data || typeof body.data !== 'string') {
        return { isValid: false, error: 'Data is required and must be a base64 string' }
    }

    if (!body.mimeType || typeof body.mimeType !== 'string') {
        return { isValid: false, error: 'MIME type is required and must be a string' }
    }

    // Validate MIME type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!validMimeTypes.includes(body.mimeType)) {
        return { isValid: false, error: 'Invalid MIME type. Must be a supported image format' }
    }

    // Validate base64 data
    try {
        atob(body.data)
    } catch {
        return { isValid: false, error: 'Invalid base64 data' }
    }

    return {
        isValid: true,
        value: {
            key: body.key,
            data: body.data,
            mimeType: body.mimeType
        }
    }
}

export async function POST(request: Request) {
    try {
        // Validate request
        const validatedRequest = await validateRequest(request, validateThumbnailSetRequest)
        
        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        // Store thumbnail data in Redis
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            // Store the thumbnail data with metadata
            const thumbnailData = {
                data: validatedRequest.data,
                mimeType: validatedRequest.mimeType,
                createdAt: new Date().toISOString(),
                size: validatedRequest.data.length
            }
            
            // Use HSET to store the thumbnail data as a hash
            await client.hSet(validatedRequest.key, thumbnailData)
            
            return true
        })

        if (!redisResult.success) {
            return NextResponse.json({
                success: false,
                error: redisResult.error || 'Failed to store thumbnail'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Thumbnail stored successfully'
        })

    } catch (error) {
        return handleError(error)
    }
}
