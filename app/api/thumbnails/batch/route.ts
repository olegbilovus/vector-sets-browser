import { NextResponse } from 'next/server'
import { RedisConnection, getRedisUrl } from '@/services/redis-server/RedisConnection'
import { handleError } from '@/services/redis-server/utils'

interface BatchThumbnailRequest {
    vectorSetName: string
    elementIds: string[]
}

function validateBatchThumbnailRequest(data: any): BatchThumbnailRequest {
    if (!data || typeof data !== 'object') {
        throw new Error('Request body must be an object')
    }

    if (!data.vectorSetName || typeof data.vectorSetName !== 'string') {
        throw new Error('vectorSetName is required and must be a string')
    }

    if (!Array.isArray(data.elementIds)) {
        throw new Error('elementIds is required and must be an array')
    }

    if (data.elementIds.length === 0) {
        throw new Error('elementIds array cannot be empty')
    }

    if (data.elementIds.length > 100) {
        throw new Error('elementIds array cannot contain more than 100 elements')
    }

    // Validate each elementId is a string
    for (const elementId of data.elementIds) {
        if (typeof elementId !== 'string') {
            throw new Error('All elementIds must be strings')
        }
    }

    return {
        vectorSetName: data.vectorSetName,
        elementIds: data.elementIds
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const validatedRequest = validateBatchThumbnailRequest(body)

        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        // Retrieve thumbnails in batch from Redis
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            const results: Record<string, string | null> = {}

            try {
                // Get all thumbnails for this vectorset in one operation
                const hashKey = `${validatedRequest.vectorSetName}:thumbnails`
                const allThumbnails = await client.HMGET(hashKey, validatedRequest.elementIds)

                // Process results
                for (let i = 0; i < validatedRequest.elementIds.length; i++) {
                    const elementId = validatedRequest.elementIds[i]
                    const thumbnailDataStr = allThumbnails[i]

                    if (thumbnailDataStr) {
                        try {
                            const thumbnailData = JSON.parse(thumbnailDataStr)
                            if (thumbnailData.data && thumbnailData.mimeType) {
                                const dataUrl = `data:${thumbnailData.mimeType};base64,${thumbnailData.data}`
                                results[elementId] = dataUrl
                            } else {
                                results[elementId] = null
                            }
                        } catch (error) {
                            console.error('Error parsing thumbnail data for', elementId, ':', error)
                            results[elementId] = null
                        }
                    } else {
                        results[elementId] = null
                    }
                }

                return results
            } catch (error) {
                console.error('Error retrieving thumbnails:', error)
                // Return empty results on error
                validatedRequest.elementIds.forEach(elementId => {
                    results[elementId] = null
                })
                return results
            }
        })

        if (!redisResult.success) {
            return NextResponse.json({
                success: false,
                error: redisResult.error || 'Failed to retrieve thumbnails'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            thumbnails: redisResult.result
        })

    } catch (error) {
        return handleError(error)
    }
}
