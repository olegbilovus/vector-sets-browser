/**
 * Redis storage operations for image thumbnails
 */

import { thumbnailSet, thumbnailGet, thumbnailDelete } from '@/services/redis-server/api'
import { extractBase64FromDataUrl } from './thumbnailUtils'

export interface ThumbnailStorageResult {
    success: boolean
    error?: string
}

export interface ThumbnailRetrievalResult {
    success: boolean
    thumbnail?: string // base64 data URL
    error?: string
}

/**
 * Store a thumbnail in Redis
 */
export async function storeThumbnail(
    vectorSetName: string,
    elementId: string,
    thumbnailDataUrl: string
): Promise<ThumbnailStorageResult> {
    try {
        console.log(`[DEBUG] Storing thumbnail for ${vectorSetName}:${elementId}`)
        const base64Data = extractBase64FromDataUrl(thumbnailDataUrl)
        console.log(`[DEBUG] Extracted base64 data length: ${base64Data.length}`)

        const mimeType = getThumbnailMimeType(thumbnailDataUrl)
        console.log(`[DEBUG] MIME type: ${mimeType}`)

        const response = await thumbnailSet({
            vectorSetName,
            elementId,
            data: base64Data,
            mimeType
        })

        console.log(`[DEBUG] thumbnailSet response:`, JSON.stringify(response, null, 2))

        if (response.success) {
            console.log(`[DEBUG] Successfully stored thumbnail for ${vectorSetName}:${elementId}`)
            return { success: true }
        } else {
            console.error(`[DEBUG] Failed to store thumbnail:`, response.error)
            return { success: false, error: response.error || 'Failed to store thumbnail' }
        }
    } catch (error) {
        console.error('Error storing thumbnail:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error storing thumbnail'
        }
    }
}

/**
 * Retrieve a thumbnail from Redis
 */
export async function retrieveThumbnail(
    vectorSetName: string,
    elementId: string
): Promise<ThumbnailRetrievalResult> {
    try {
        console.log(`[DEBUG] Retrieving thumbnail for ${vectorSetName}:${elementId}`)
        const response = await thumbnailGet(vectorSetName, elementId)
        console.log(`[DEBUG] thumbnailGet response:`, JSON.stringify(response, null, 2))

        if (response.success && response.data) {
            const { data: base64Data, mimeType } = response.data
            const dataUrl = `data:${mimeType};base64,${base64Data}`
            console.log(`[DEBUG] Successfully retrieved thumbnail for ${vectorSetName}:${elementId}, dataUrl length: ${dataUrl.length}`)
            return { success: true, thumbnail: dataUrl }
        } else {
            // Distinguish between "not found" (normal) and actual errors
            const errorMsg = response.error || 'Thumbnail not found'
            console.log(`[DEBUG] Thumbnail not found for ${vectorSetName}:${elementId}: ${errorMsg}`)
            return { success: false, error: errorMsg }
        }
    } catch (error) {
        // Since we handle 404s gracefully in the API layer, any error here is unexpected
        console.error('Error retrieving thumbnail:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error retrieving thumbnail'
        }
    }
}

/**
 * Delete a thumbnail from Redis
 */
export async function deleteThumbnail(
    vectorSetName: string,
    elementId: string
): Promise<ThumbnailStorageResult> {
    try {
        const response = await thumbnailDelete({ vectorSetName, elementId })

        if (response.success) {
            return { success: true }
        } else {
            return { success: false, error: response.error || 'Failed to delete thumbnail' }
        }
    } catch (error) {
        console.error('Error deleting thumbnail:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error deleting thumbnail'
        }
    }
}

/**
 * Batch retrieve thumbnails for multiple elements using new batch API
 */
export async function retrieveThumbnailsBatch(
    vectorSetName: string,
    elementIds: string[]
): Promise<Record<string, string | null>> {
    if (elementIds.length === 0) {
        return {}
    }

    try {
        const response = await fetch('/api/thumbnails/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vectorSetName,
                elementIds
            })
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.success) {
            return result.thumbnails || {}
        } else {
            console.error('Batch thumbnail retrieval failed:', result.error)
            return {}
        }
    } catch (error) {
        console.error('Error in batch thumbnail retrieval:', error)
        return {}
    }
}



/**
 * Extract MIME type from data URL
 */
function getThumbnailMimeType(dataUrl: string): string {
    const match = dataUrl.match(/^data:([^;]+);base64,/)
    return match ? match[1] : 'image/jpeg'
}

/**
 * Check if a thumbnail exists for a given element
 */
export async function thumbnailExists(
    vectorSetName: string,
    elementId: string
): Promise<boolean> {
    try {
        const result = await retrieveThumbnail(vectorSetName, elementId)
        return result.success
    } catch {
        return false
    }
}

/**
 * Delete all thumbnails for a vector set
 */
export async function deleteVectorSetThumbnails(
    vectorSetName: string
): Promise<ThumbnailStorageResult> {
    try {
        const response = await fetch('/api/thumbnails/vectorset', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vectorSetName
            })
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.success) {
            return { success: true }
        } else {
            return { success: false, error: result.error || 'Failed to delete vectorset thumbnails' }
        }
    } catch (error) {
        console.error('Error deleting vectorset thumbnails:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error deleting vectorset thumbnails'
        }
    }
}

/**
 * Delete thumbnails for specific elements
 */
export async function deleteElementThumbnails(
    vectorSetName: string,
    elementIds: string[]
): Promise<ThumbnailStorageResult> {
    try {
        const response = await fetch('/api/thumbnails/elements', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vectorSetName,
                elementIds
            })
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.success) {
            return { success: true }
        } else {
            return { success: false, error: result.error || 'Failed to delete element thumbnails' }
        }
    } catch (error) {
        console.error('Error deleting element thumbnails:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error deleting element thumbnails'
        }
    }
}

/**
 * Get thumbnail storage statistics for a vector set
 */
export async function getThumbnailStats(_vectorSetName: string): Promise<{
    totalThumbnails: number
    totalSize: number
}> {
    try {
        // For now, return basic stats - this could be enhanced with a dedicated API endpoint
        return { totalThumbnails: 0, totalSize: 0 }
    } catch (error) {
        console.error('Error getting thumbnail stats:', error)
        return { totalThumbnails: 0, totalSize: 0 }
    }
}
