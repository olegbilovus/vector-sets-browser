import VectorHeatmapRenderer from "./VectorHeatmapRenderer"
import VectorDistributionRenderer from "./VectorDistributionRenderer"
import VectorRadialRenderer from "./VectorRadialRenderer"
import Vector3DSurfaceRenderer from "./Vector3DSurfaceRenderer"

interface VectorVisualizationRendererProps {
    vector: number[] | null
    className?: string
    size?: number
    showStats?: boolean
    scalingMode?: 'relative' | 'absolute'
    colorScheme?: 'thermal' | 'viridis' | 'classic'
    visualizationType?: 'heatmap' | 'distribution' | 'radial' | 'surface'
    noPadding?: boolean
}

export default function VectorVisualizationRenderer({
    vector,
    className = "",
    size = 300,
    showStats = false,
    scalingMode = 'relative',
    colorScheme = 'thermal',
    visualizationType = 'heatmap',
    noPadding = false
}: VectorVisualizationRendererProps) {
    
    if (visualizationType === 'distribution') {
        return (
            <VectorDistributionRenderer
                vector={vector}
                className={className}
                size={size}
                showStats={showStats}
                scalingMode={scalingMode}
                colorScheme={colorScheme}
            />
        )
    }

    if (visualizationType === 'radial') {
        return (
            <VectorRadialRenderer
                vector={vector}
                className={className}
                size={size}
                showStats={showStats}
                scalingMode={scalingMode}
                colorScheme={colorScheme}
                noPadding={noPadding}
            />
        )
    }

    if (visualizationType === 'surface') {
        return (
            <Vector3DSurfaceRenderer
                vector={vector}
                className={className}
                size={size}
                showStats={showStats}
                scalingMode={scalingMode}
                colorScheme={colorScheme}
                noPadding={noPadding}
            />
        )
    }

    return (
        <VectorHeatmapRenderer
            vector={vector}
            className={className}
            size={size}
            showStats={showStats}
            scalingMode={scalingMode}
            colorScheme={colorScheme}
        />
    )
} 