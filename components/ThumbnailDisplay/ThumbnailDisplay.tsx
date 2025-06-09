import React from 'react'
import { ImageOff } from 'lucide-react'
import { useThumbnail } from './ThumbnailProvider'
import { VectorSetMetadata } from '@/lib/types/vectors'
import { isImageEmbedding, isMultiModalEmbedding } from '@/services/embeddings/types/embeddingModels'

interface ThumbnailDisplayProps {
    vectorSetName: string
    elementId: string
    size?: 'small' | 'medium' | 'large'
    className?: string
    showFallback?: boolean
    onError?: (error: string) => void
    metadata?: VectorSetMetadata | null
}

const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12', 
    large: 'w-16 h-16'
}

const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
}

function ThumbnailDisplayCore({
    vectorSetName,
    elementId,
    size = 'medium',
    className = '',
    showFallback = true,
    onError,
    metadata
}: ThumbnailDisplayProps) {
    // Early return if this vector set doesn't support images
    if (metadata && !isImageEmbedding(metadata.embedding) && !isMultiModalEmbedding(metadata.embedding)) {
        return null
    }
    const { thumbnail, isLoading, error } = useThumbnail(vectorSetName, elementId)

    // Call onError callback when there's an actual error (not just missing thumbnail)
    React.useEffect(() => {
        if (error && onError && !error.includes('not found') && !error.includes('404')) {
            onError(error)
        }
    }, [error, onError])

    const baseClasses = `${sizeClasses[size]} rounded overflow-hidden flex items-center justify-center ${className}`

    // Loading state
    if (isLoading) {
        return (
            <div className={`${baseClasses} bg-gray-100 animate-pulse`}>
                <div className={`${iconSizeClasses[size]} bg-gray-300 rounded`} />
            </div>
        )
    }

    // Error state or no thumbnail
    if (error || !thumbnail) {
        if (!showFallback) {
            return null
        }

        return (
            <div className={`${baseClasses} bg-gray-100 text-gray-400`}>
                <ImageOff className={iconSizeClasses[size]} />
            </div>
        )
    }

    // Success state - show thumbnail
    return (
        <div className={`${baseClasses} bg-gray-100`}>
            <img
                src={thumbnail}
                alt={`Thumbnail for ${elementId}`}
                className="w-full h-full object-cover"
                onError={() => {
                    // Note: We can't easily update the cache from here in the new system
                    // The error will be handled by the service layer on next request
                }}
            />
        </div>
    )
}

// Hook for batch loading thumbnails (deprecated - use useThumbnails from ThumbnailProvider instead)
export { useThumbnails as useThumbnailBatch } from './ThumbnailProvider'

// Main export with validation
export default function ThumbnailDisplay(props: ThumbnailDisplayProps) {
    // Don't render anything if we don't have the required props
    if (!props.vectorSetName || !props.elementId) {
        return null
    }

    return <ThumbnailDisplayCore {...props} />
}
