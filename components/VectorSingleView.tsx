import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorScheme, ScalingMode, VisualizationType } from "@/hooks/useVectorSettings"
import VectorVisualizationRenderer from "./VectorVisualizationRenderer"
import VectorStatistics from "./VectorStatistics"
import VectorColorLegend from "./VectorColorLegend"
import ColorSchemeSelector from "./ColorSchemeSelector"

interface VectorSingleViewProps {
    vector: number[] | null
    colorScheme: ColorScheme
    scalingMode: ScalingMode
    visualizationType: VisualizationType
    onColorSchemeChange: (scheme: ColorScheme) => void
    onScalingModeChange: (mode: ScalingMode) => void
    forceRender: number
}

export default function VectorSingleView({
    vector,
    colorScheme,
    scalingMode,
    visualizationType,
    onColorSchemeChange,
    onScalingModeChange,
    forceRender,
}: VectorSingleViewProps) {
    return (
        <div className="flex gap-6">
            <div className="flex-1">
                <div
                    className="vector-visualization w-full flex justify-center items-center border rounded-lg"
                    style={{
                        minWidth: "500px",
                        height: "500px",
                    }}
                    key={`${colorScheme}-${scalingMode}-${visualizationType}-${forceRender}`}
                >
                    <VectorVisualizationRenderer
                        vector={vector}
                        showStats={true}
                        size={425}
                        colorScheme={colorScheme}
                        scalingMode={scalingMode}
                        visualizationType={visualizationType}
                    />
                </div>
            </div>

            <div className="w-72 space-y-4">
                {vector && vector.length > 0 && (
                    <VectorStatistics
                        vector={vector}
                        title="Vector Statistics"
                    />
                )}

                {vector && vector.length > 0 && (
                    <div className="border rounded-lg p-3 bg-slate-50">
                        <div className="mt-4 pt-3 border-t border-gray-300">
                            <label className="block text-sm font-medium mb-2">
                                Scaling Mode:
                            </label>
                            <Select
                                value={scalingMode}
                                onValueChange={(value) =>
                                    onScalingModeChange(value as ScalingMode)
                                }
                            >
                                <SelectTrigger className="w-full text-sm">
                                    <SelectValue placeholder="Select scaling mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="relative">
                                        Relative (min/max)
                                    </SelectItem>
                                    <SelectItem value="absolute">
                                        Absolute (-1 to 1)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <div className="border rounded-lg p-3 bg-slate-50">
                    <h4 className="font-medium mb-3">Legend & Colors</h4>

                    <div className="mb-4">
                        <ColorSchemeSelector
                            value={colorScheme}
                            onChange={onColorSchemeChange}
                            showPreview={false}
                        />
                    </div>

                    {vector && vector.length > 0 && (
                        <VectorColorLegend
                            vector={vector}
                            colorScheme={colorScheme}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
