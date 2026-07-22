import { NextResponse } from 'next/server'
import { RedisConnection, getRedisUrl } from '@/services/redis-server/RedisConnection'
import { handleError } from '@/services/redis-server/utils'

interface DeleteElementThumbnailsRequest {
    vectorSetName: string
    elementIds: string[]
}

function validateDeleteElementThumbnailsRequest(data: any): DeleteElementThumbnailsRequest {
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

    if (data.elementIds.length > 1000) {
        throw new Error('elementIds array cannot contain more than 1000 elements')
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

export async function DELETE(request: Request) {
    try {
        const body = await request.json()
        const validatedRequest = validateDeleteElementThumbnailsRequest(body)

        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        // Delete thumbnails for specific elements
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            try {
                if (validatedRequest.elementIds.length === 0) {
                    return { deletedCount: 0 }
                }

                // Delete all element fields from the vectorset hash
                const hashKey = `${validatedRequest.vectorSetName}:thumbnails`
                const deleteResult = await client.hDel(hashKey, validatedRequest.elementIds)

                return { deletedCount: deleteResult }
            } catch (error) {
                console.error('Error deleting element thumbnails:', error)
                throw error
            }
        })

        if (!redisResult.success) {
            return NextResponse.json({
                success: false,
                error: redisResult.error || 'Failed to delete element thumbnails'
            }, { status: 500 })
        }

        // ApiResponse leaves result optional even when success is true.
        const deletedCount = redisResult.result?.deletedCount ?? 0

        return NextResponse.json({
            success: true,
            deletedCount,
            message: `Deleted ${deletedCount} thumbnails for ${validatedRequest.elementIds.length} elements`
        })

    } catch (error) {
        return handleError(error)
    }
}
