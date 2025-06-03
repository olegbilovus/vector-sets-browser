import { ColorScheme, ScalingMode, VisualizationType } from "@/hooks/useVectorSettings"
import VectorVisualizationRenderer from "./VectorVisualizationRenderer"
import VectorStatistics from "./VectorStatistics"
import VectorVisualizationControls from "./VectorVisualizationControls"

interface VectorComparisonViewProps {
    searchVector: number[] | null
    resultVector: number[] | null
    colorScheme: ColorScheme
    scalingMode: ScalingMode
    visualizationType: VisualizationType
    onColorSchemeChange: (scheme: ColorScheme) => void
    onScalingModeChange: (mode: ScalingMode) => void
    searchQuery?: string | null
    lastSearchDisplayName?: string | null
    elementName?: string | null
    forceRender: number
}

export default function VectorComparisonView({
    searchVector,
    resultVector,
    colorScheme,
    scalingMode,
    visualizationType,
    onColorSchemeChange,
    onScalingModeChange,
    searchQuery,
    lastSearchDisplayName,
    elementName,
    forceRender,
}: VectorComparisonViewProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="flex space-x-2 justify-center items-center text-lg">
                        <div className="text-gray-600 whitespace-nowrap">
                            Search Vector:{" "}
                        </div>
                        {(lastSearchDisplayName || searchQuery) && (
                            <div className="text-black font-semibold text-ellipsis line-clamp-1">
                                "{lastSearchDisplayName || searchQuery}"
                            </div>
                        )}
                    </h3>
                    <div
                        className="vector-visualization w-full flex justify-center items-center border rounded-lg"
                        style={{
                            height: "400px",
                        }}
                        key={`search-${colorScheme}-${scalingMode}-${visualizationType}-${forceRender}`}
                    >
                        <VectorVisualizationRenderer
                            vector={searchVector}
                            showStats={false}
                            size={350}
                            colorScheme={colorScheme}
                            scalingMode={scalingMode}
                            visualizationType={visualizationType}
                        />
                    </div>
                    {searchVector && searchVector.length > 0 && (
                        <VectorStatistics vector={searchVector} />
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="flex space-x-2 justify-center items-center text-lg">
                        <div className="text-gray-600 whitespace-nowrap">
                            Selected Vector:{" "}
                        </div>
                        {elementName && (
                            <div className=" text-black font-semibold text-ellipsis line-clamp-1">
                                {elementName}
                            </div>
                        )}
                    </h3>
                    <div
                        className="vector-visualization w-full flex justify-center items-center border rounded-lg"
                        style={{
                            height: "400px",
                        }}
                        key={`result-${colorScheme}-${scalingMode}-${visualizationType}-${forceRender}`}
                    >
                        <VectorVisualizationRenderer
                            vector={resultVector}
                            showStats={false}
                            size={350}
                            colorScheme={colorScheme}
                            scalingMode={scalingMode}
                            visualizationType={visualizationType}
                        />
                    </div>
                    {resultVector && resultVector.length > 0 && (
                        <VectorStatistics vector={resultVector} />
                    )}
                </div>
            </div>

            <VectorVisualizationControls
                colorScheme={colorScheme}
                scalingMode={scalingMode}
                onColorSchemeChange={onColorSchemeChange}
                onScalingModeChange={onScalingModeChange}
                layout="horizontal"
            />
        </div>
    )
}
