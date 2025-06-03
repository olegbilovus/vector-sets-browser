import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorScheme, ScalingMode } from "@/hooks/useVectorSettings"
import ColorSchemeSelector from "./ColorSchemeSelector"

interface VectorVisualizationControlsProps {
    colorScheme: ColorScheme
    scalingMode: ScalingMode
    onColorSchemeChange: (scheme: ColorScheme) => void
    onScalingModeChange: (mode: ScalingMode) => void
    layout?: "horizontal" | "vertical"
    className?: string
}

export default function VectorVisualizationControls({
    colorScheme,
    scalingMode,
    onColorSchemeChange,
    onScalingModeChange,
    layout = "vertical",
    className = "",
}: VectorVisualizationControlsProps) {
    const containerClass = layout === "horizontal" 
        ? "grid grid-cols-2 gap-4" 
        : "space-y-4"

    return (
        <div className={`border rounded-lg p-4 bg-slate-50 ${className}`}>
            <h4 className="font-medium mb-3">Visualization Controls</h4>
            <div className={containerClass}>
                <div>
                    <ColorSchemeSelector
                        value={colorScheme}
                        onChange={onColorSchemeChange}
                        showPreview={false}
                    />
                </div>
                <div>
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
        </div>
    )
}
