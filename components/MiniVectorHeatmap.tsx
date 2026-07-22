import { useState, useEffect, useRef } from "react"
import VectorVisualizationRenderer from "./VectorVisualizationRenderer"
import VectorHeatmap from "./VectorHeatmap"
import { useVectorSettings } from "@/hooks/useVectorSettings"
import { VectorSetMetadata } from "@/lib/types/vectors"

interface MiniVectorHeatmapProps {
    vector: number[] | null
    disabled?: boolean
    isGeneratingEmbedding?: boolean
    size?: number // Size in pixels, defaults to 80
    vectorSetName?: string | null
    metadata?: VectorSetMetadata | null
    searchVector?: number[] | null
    elementName?: string | null
    searchQuery?: string | null
    lastSearchDisplayName?: string | null
}

export default function MiniVectorHeatmap({ 
    vector, 
    disabled = false, 
    isGeneratingEmbedding = false,
    size = 80,
    vectorSetName = null,
    metadata = null,
    searchVector = null,
    elementName = null,
    searchQuery = null,
    lastSearchDisplayName = null
}: MiniVectorHeatmapProps) {
    const [showHeatmap, setShowHeatmap] = useState(false)
    const [isResolving, setIsResolving] = useState(false)
    const isClosingRef = useRef(false)
    const { settings } = useVectorSettings(vectorSetName, metadata)
        
    // Check if we have a valid vector to display
    const hasValidVector = vector && 
        Array.isArray(vector) && 
        vector.length > 0 && 
        vector.every(val => typeof val === 'number' && !isNaN(val) && isFinite(val))
    
    // Handle the resolving animation when vector becomes available
    useEffect(() => {
        if (hasValidVector && isGeneratingEmbedding === false) {
            // Small delay to ensure the heatmap is rendered before we start resolving
            const timer = setTimeout(() => {
                setIsResolving(true)
            }, 100)
            return () => clearTimeout(timer)
        } else {
            setIsResolving(false)
        }
    }, [hasValidVector, isGeneratingEmbedding])
    
    // Calculate Tailwind classes based on size
    const sizeClass = size <= 40 ? 'w-10 h-10' : size <= 60 ? 'w-15 h-15' : 'w-20 h-20'
    
    // Skip rendering if disabled
    if (disabled) {
        return null
    }
    
    // Show loading state with blur effect when generating embedding
    if (isGeneratingEmbedding || (hasValidVector && !isResolving)) {
        return (
            <div 
                className={`mini-vector-heatmap flex ${sizeClass} items-center justify-center rounded relative overflow-hidden`}
                title="Generating embedding..."
            >
                {/* Blurred placeholder - generate a simple noise pattern */}
                <div 
                    className="absolute inset-0 opacity-60"
                    style={{
                        background: `
                            radial-gradient(circle at 20% 20%, rgba(59, 76, 192, 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(180, 4, 38, 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 40% 70%, rgba(59, 76, 192, 0.2) 0%, transparent 50%),
                            radial-gradient(circle at 70% 80%, rgba(180, 4, 38, 0.2) 0%, transparent 50%),
                            radial-gradient(circle at 60% 40%, rgba(247, 247, 247, 0.4) 0%, transparent 50%)
                        `,
                        filter: 'blur(8px)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }}
                />
                {/* Pulsing blur effect overlay */}
                <div 
                    className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-gray-100/40 to-red-100/30"
                    style={{
                        filter: 'blur(4px)',
                        animation: 'pulse 1.5s ease-in-out infinite reverse'
                    }}
                />
            </div>
        )
    }
    
    // Handle dialog close with debouncing to prevent race conditions
    const handleHeatmapClose = (open: boolean) => {
        if (!open) {
            isClosingRef.current = true
            setShowHeatmap(false)
            // Reset the closing flag after a short delay
            setTimeout(() => {
                isClosingRef.current = false
            }, 200)
        } else {
            setShowHeatmap(true)
        }
    }

    // Handle click with race condition prevention
    const handleClick = (e: React.MouseEvent) => {
        // Prevent opening if dialog is currently closing
        if (isClosingRef.current) {
            return
        }

        e.stopPropagation()
        setShowHeatmap(true)
    }

    // Don't show anything if no valid vector
    if (!hasValidVector) {
        return null
    }

    return (
        <>
            <div
                className={`mini-vector-heatmap cursor-pointer flex ${sizeClass} items-center justify-center rounded hover:bg-gray-100 transition-colors relative overflow-hidden`}
                onClick={handleClick}
                title="View vector visualization"
            >
                <div 
                    className="relative h-full overflow-hidden flex items-center justify-center transition-all duration-1000 ease-out"
                    style={{
                        filter: isResolving ? 'blur(0px)' : 'blur(12px)',
                        opacity: isResolving ? 1 : 0.7,
                        transform: isResolving ? 'scale(1)' : 'scale(1.05)'
                    }}
                >
                    <VectorVisualizationRenderer 
                        vector={vector}
                        showStats={false}
                        size={size}
                        colorScheme={settings.colorScheme}
                        scalingMode={settings.scalingMode}
                        visualizationType={settings.visualizationType}
                        noPadding={true}
                    />
                </div>
            </div>
            
            <VectorHeatmap
                vector={vector}
                open={showHeatmap}
                onOpenChange={handleHeatmapClose}
                vectorSetName={vectorSetName}
                metadata={metadata}
                searchVector={searchVector}
                elementName={elementName}
                searchQuery={searchQuery}
                lastSearchDisplayName={lastSearchDisplayName}
            />
        </>
    )
} 