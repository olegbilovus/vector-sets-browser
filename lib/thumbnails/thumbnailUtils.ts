/**
 * Utility functions for image thumbnail generation and processing
 */

export interface ThumbnailOptions {
    width?: number
    height?: number
    quality?: number
    format?: 'jpeg' | 'png' | 'webp'
}

const DEFAULT_THUMBNAIL_OPTIONS: Required<ThumbnailOptions> = {
    width: 150,
    height: 150,
    quality: 0.8,
    format: 'jpeg'
}

/**
 * Generate a thumbnail from an image file
 */
export async function generateThumbnail(
    file: File, 
    options: ThumbnailOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options }
    
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        
        if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
        }
        
        img.onload = () => {
            try {
                // Calculate dimensions maintaining aspect ratio
                const { width: targetWidth, height: targetHeight } = calculateThumbnailDimensions(
                    img.width,
                    img.height,
                    opts.width,
                    opts.height
                )

                // Set canvas size
                canvas.width = targetWidth
                canvas.height = targetHeight

                // Draw and resize image
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

                // Convert to base64
                const mimeType = `image/${opts.format}`
                const base64Data = canvas.toDataURL(mimeType, opts.quality)

                resolve(base64Data)
            } catch (error) {
                console.error(`Failed to generate thumbnail for ${file.name}:`, error)
                reject(new Error(`Failed to generate thumbnail: ${error}`))
            }
        }

        img.onerror = (error) => {
            console.error(`Failed to load image for thumbnail generation: ${file.name}`, error)
            reject(new Error(`Failed to load image for thumbnail generation: ${file.name}`))
        }
        
        // Load the image
        const reader = new FileReader()
        reader.onload = (e) => {
            if (e.target?.result) {
                const dataUrl = e.target.result as string

                // Set a timeout for image loading to catch hanging loads
                const loadTimeout = setTimeout(() => {
                    console.error(`Image load timeout for ${file.name}`)
                    reject(new Error(`Image load timeout for ${file.name}`))
                }, 10000) // 10 second timeout

                // Clear timeout on successful load
                const originalOnLoad = img.onload
                img.onload = () => {
                    clearTimeout(loadTimeout)
                    originalOnLoad?.()
                }

                // Clear timeout on error
                const originalOnError = img.onerror
                img.onerror = (error) => {
                    clearTimeout(loadTimeout)
                    originalOnError?.(error)
                }

                img.src = dataUrl
            } else {
                reject(new Error('Failed to read image file'))
            }
        }
        reader.onerror = () => {
            console.error(`Failed to read file: ${file.name}`)
            reject(new Error(`Failed to read image file: ${file.name}`))
        }

        reader.readAsDataURL(file)
    })
}

/**
 * Calculate thumbnail dimensions maintaining aspect ratio
 */
function calculateThumbnailDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight
    
    let width = maxWidth
    let height = maxHeight
    
    if (aspectRatio > 1) {
        // Landscape: width is larger
        height = Math.round(maxWidth / aspectRatio)
        if (height > maxHeight) {
            height = maxHeight
            width = Math.round(maxHeight * aspectRatio)
        }
    } else {
        // Portrait or square: height is larger or equal
        width = Math.round(maxHeight * aspectRatio)
        if (width > maxWidth) {
            width = maxWidth
            height = Math.round(maxWidth / aspectRatio)
        }
    }
    
    return { width, height }
}

/**
 * Generate Redis key for thumbnail storage
 */
export function generateThumbnailKey(vectorSetName: string, elementId: string): string {
    return `thumbnail:${vectorSetName}:${elementId}`
}

/**
 * Extract base64 data from data URL
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
    const base64Index = dataUrl.indexOf(',')
    if (base64Index === -1) {
        throw new Error('Invalid data URL format')
    }
    return dataUrl.substring(base64Index + 1)
}

/**
 * Validate if a file is a supported image type for thumbnail generation
 */
export function isSupportedImageType(file: File): boolean {
    const supportedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp'
    ]

    // Check by MIME type first
    const isSupportedByMimeType = supportedTypes.includes(file.type.toLowerCase())

    // If MIME type check fails, fallback to file extension check
    if (!isSupportedByMimeType) {
        const fileName = file.name.toLowerCase()
        const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        const isSupportedByExtension = supportedExtensions.some(ext => fileName.endsWith(ext))

        if (isSupportedByExtension) {
            return true
        }
    }

    return isSupportedByMimeType
}

/**
 * Get file size in a human readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
