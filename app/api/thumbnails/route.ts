import { NextResponse } from 'next/server'
import { RedisConnection, getRedisUrl } from '@/lib/redis-server/RedisConnection'
import { validateRequest, handleError } from '@/lib/redis-server/utils'

// Types
interface ThumbnailSetRequest {
    vectorSetName: string
    elementId: string
    data: string // base64 encoded image data
    mimeType: string
}

interface ThumbnailDeleteRequest {
    vectorSetName: string
    elementId: string
}

// Validation functions
function validateThumbnailSetRequest(body: any): { isValid: boolean; error?: string; value?: ThumbnailSetRequest } {
    if (!body.vectorSetName || typeof body.vectorSetName !== 'string') {
        return { isValid: false, error: 'vectorSetName is required and must be a string' }
    }

    if (!body.elementId || typeof body.elementId !== 'string') {
        return { isValid: false, error: 'elementId is required and must be a string' }
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
            vectorSetName: body.vectorSetName,
            elementId: body.elementId,
            data: body.data,
            mimeType: body.mimeType
        }
    }
}

function validateThumbnailDeleteRequest(body: any): { isValid: boolean; error?: string; value?: ThumbnailDeleteRequest } {
    if (!body.vectorSetName || typeof body.vectorSetName !== 'string') {
        return { isValid: false, error: 'vectorSetName is required and must be a string' }
    }

    if (!body.elementId || typeof body.elementId !== 'string') {
        return { isValid: false, error: 'elementId is required and must be a string' }
    }

    return {
        isValid: true,
        value: {
            vectorSetName: body.vectorSetName,
            elementId: body.elementId
        }
    }
}

// GET - Retrieve thumbnail
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const vectorSetName = searchParams.get('vectorSetName')
        const elementId = searchParams.get('elementId')

        if (!vectorSetName) {
            return NextResponse.json(
                { success: false, error: 'vectorSetName parameter is required' },
                { status: 400 }
            )
        }

        if (!elementId) {
            return NextResponse.json(
                { success: false, error: 'elementId parameter is required' },
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
            // Get the thumbnail data from the vectorset hash
            const hashKey = `${vectorSetName}:thumbnails`
            const thumbnailDataStr = await client.hGet(hashKey, elementId)

            if (!thumbnailDataStr) {
                return null
            }

            try {
                return JSON.parse(thumbnailDataStr)
            } catch (error) {
                console.error('Error parsing thumbnail data:', error)
                return null
            }
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

// POST - Store thumbnail
export async function POST(request: Request) {
    try {
        console.log('[DEBUG] Thumbnail POST request received')

        // Validate request
        const validatedRequest = await validateRequest(request, validateThumbnailSetRequest)
        console.log('[DEBUG] Validated request:', {
            vectorSetName: validatedRequest.vectorSetName,
            elementId: validatedRequest.elementId,
            mimeType: validatedRequest.mimeType,
            dataLength: validatedRequest.data.length
        })
        
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

            // Use HSET to store the thumbnail data in the vectorset hash
            const hashKey = `${validatedRequest.vectorSetName}:thumbnails`
            console.log(`[DEBUG] Storing in Redis hash: ${hashKey}, field: ${validatedRequest.elementId}`)

            const result = await client.hSet(hashKey, validatedRequest.elementId, JSON.stringify(thumbnailData))
            console.log(`[DEBUG] Redis hSet result:`, result)

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

// DELETE - Remove thumbnail
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
            // Delete the thumbnail from the vectorset hash
            const hashKey = `${validatedRequest.vectorSetName}:thumbnails`
            const result = await client.hDel(hashKey, validatedRequest.elementId)
            return result > 0 // Returns true if field was deleted, false if it didn't exist
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
