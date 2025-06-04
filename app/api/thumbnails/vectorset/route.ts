import { NextResponse } from 'next/server'
import { RedisConnection, getRedisUrl } from '@/lib/redis-server/RedisConnection'
import { handleError } from '@/lib/redis-server/utils'

interface DeleteVectorSetThumbnailsRequest {
    vectorSetName: string
}

function validateDeleteVectorSetThumbnailsRequest(data: any): DeleteVectorSetThumbnailsRequest {
    if (!data || typeof data !== 'object') {
        throw new Error('Request body must be an object')
    }

    if (!data.vectorSetName || typeof data.vectorSetName !== 'string') {
        throw new Error('vectorSetName is required and must be a string')
    }

    return {
        vectorSetName: data.vectorSetName
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json()
        const validatedRequest = validateDeleteVectorSetThumbnailsRequest(body)

        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        // Delete all thumbnails for the vector set
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            try {
                // Delete the entire vectorset thumbnail hash
                const hashKey = `${validatedRequest.vectorSetName}:thumbnails`
                const deleteResult = await client.del(hashKey)

                return { deletedCount: deleteResult }
            } catch (error) {
                console.error('Error deleting vectorset thumbnails:', error)
                throw error
            }
        })

        if (!redisResult.success) {
            return NextResponse.json({
                success: false,
                error: redisResult.error || 'Failed to delete vectorset thumbnails'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            deletedCount: redisResult.result.deletedCount,
            message: `Deleted ${redisResult.result.deletedCount} thumbnails for vector set '${validatedRequest.vectorSetName}'`
        })

    } catch (error) {
        return handleError(error)
    }
}
