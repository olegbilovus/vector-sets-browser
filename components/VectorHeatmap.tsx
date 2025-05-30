import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useVectorSettings } from "@/hooks/useVectorSettings"
import { VectorSetMetadata } from "@/lib/types/vectors"
import { Download, Info, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import ColorSchemeSelector from "./ColorSchemeSelector"
import VectorVisualizationRenderer from "./VectorVisualizationRenderer"

interface VectorHeatmapProps {
    vector: number[] | null
    open: boolean
    onOpenChange: (open: boolean) => void
    vectorSetName?: string | null
    metadata?: VectorSetMetadata | null
}

export default function VectorHeatmap({
    vector,
    open,
    onOpenChange,
    vectorSetName = null,
    metadata = null,
}: VectorHeatmapProps) {
    const [forceRender, setForceRender] = useState(0)
    const [descriptionOpen, setDescriptionOpen] = useState(false)
    const {
        settings,
        setColorScheme,
        setScalingMode,
        setVisualizationType,
        isImageBased,
        resetToDefaults,
        makeDefault,
    } = useVectorSettings(vectorSetName, metadata)

    // Force redraw on dialog open or settings change
    useEffect(() => {
        if (open) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                setForceRender((prev) => prev + 1)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [
        open,
        settings.colorScheme,
        settings.scalingMode,
        settings.visualizationType,
    ])

    // Handle making current settings the default
    const handleMakeDefault = () => {
        const success = makeDefault()
        if (success) {
            const vectorType = isImageBased ? "image/multimodal" : "text"
            toast.success(
                `Settings saved as default for all ${vectorType} vectorsets`
            )
        } else {
            toast.error("Failed to save settings as default")
        }
    }

    // Download visualization as image
    const downloadVisualization = () => {
        const canvas = document.querySelector(
            ".vector-visualization canvas"
        ) as HTMLCanvasElement
        if (!canvas) return

        const link = document.createElement("a")
        link.download = `vector-${settings.visualizationType}.png`
        link.href = canvas.toDataURL("image/png")
        link.click()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle>Vector Visualization</DialogTitle>
                    <div className="flex gap-2">
                        {vectorSetName && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMakeDefault}
                                className="text-xs px-2 py-1"
                                title={`Make these settings the default for all ${
                                    isImageBased
                                        ? "image/multimodal"
                                        : "text"
                                } vectorsets`}
                            >
                                Set as Default
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={downloadVisualization}
                        >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Tabs for Visualization Type */}
                <Tabs
                    value={settings.visualizationType}
                    onValueChange={(value) =>
                        setVisualizationType(value as any)
                    }
                >
                    <div className="flex items-center mb-4 space-x-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="heatmap">
                                🔥 Heatmap
                            </TabsTrigger>
                            <TabsTrigger value="distribution">
                                📊 Distribution
                            </TabsTrigger>
                            <TabsTrigger value="radial">⭕ Radial</TabsTrigger>
                        </TabsList>

                    </div>

                    {/* Main Content */}
                    <div className="flex gap-6">
                        {/* Visualization Area - Takes up most space */}
                        <div className="flex-1">
                            <div
                                className="vector-visualization w-full flex justify-center items-center border rounded-lg"
                                style={{
                                    minWidth: "500px",
                                    height: "500px",
                                }}
                                key={`${settings.colorScheme}-${settings.scalingMode}-${settings.visualizationType}-${forceRender}`}
                            >
                                <VectorVisualizationRenderer
                                    vector={vector}
                                    showStats={true}
                                    size={425}
                                    colorScheme={settings.colorScheme}
                                    scalingMode={settings.scalingMode}
                                    visualizationType={
                                        settings.visualizationType
                                    }
                                />
                            </div>
                        </div>

                        {/* Right Panel - Compact Stats and Settings */}
                        <div className="w-72 space-y-4">
                            {/* Vector Statistics */}
                            {vector && vector.length > 0 && (
                                <div className="border rounded-lg p-3 bg-slate-50">
                                    <h4 className="font-medium mb-3">
                                        Vector Statistics
                                    </h4>
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span>Dimensions:</span>
                                            <span className="font-mono">
                                                {vector.length}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Range:</span>
                                            <span className="font-mono">
                                                {Math.min(...vector).toFixed(4)}{" "}
                                                to{" "}
                                                {Math.max(...vector).toFixed(4)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Average:</span>
                                            <span className="font-mono">
                                                {(
                                                    vector.reduce(
                                                        (sum, val) => sum + val,
                                                        0
                                                    ) / vector.length
                                                ).toFixed(4)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Non-zero:</span>
                                            <span className="font-mono">
                                                {
                                                    vector.filter(
                                                        (v) => v !== 0
                                                    ).length
                                                }{" "}
                                                (
                                                {(
                                                    (vector.filter(
                                                        (v) => v !== 0
                                                    ).length /
                                                        vector.length) *
                                                    100
                                                ).toFixed(1)}
                                                %)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Scaling Mode under stats */}
                                    <div className="mt-4 pt-3 border-t border-gray-300">
                                        <label className="block text-sm font-medium mb-2">
                                            Scaling Mode:
                                        </label>
                                        <select
                                            value={settings.scalingMode}
                                            onChange={(e) =>
                                                setScalingMode(
                                                    e.target.value as any
                                                )
                                            }
                                            className="border rounded px-2 py-1 w-full text-sm"
                                        >
                                            <option value="relative">
                                                Relative (min/max)
                                            </option>
                                            <option value="absolute">
                                                Absolute (-1 to 1)
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Color Legend and Color Scheme - Shows for all visualization types */}
                            <div className="border rounded-lg p-3 bg-slate-50">
                                <h4 className="font-medium mb-3">
                                    Legend & Colors
                                </h4>

                                {/* Color Scheme Selector */}
                                <div className="mb-4">
                                    <ColorSchemeSelector
                                        value={settings.colorScheme}
                                        onChange={setColorScheme}
                                        showPreview={false}
                                    />
                                </div>

                                {/* Color Legend */}
                                <div className="space-y-2">
                                    {(() => {
                                        type LegendItem = {
                                            color: string
                                            label: string
                                            border?: boolean
                                        }

                                        const legends: Record<
                                            string,
                                            LegendItem[]
                                        > = {
                                            thermal: [
                                                {
                                                    color: "#000000",
                                                    label: "Lowest",
                                                },
                                                {
                                                    color: "#400080",
                                                    label: "Low",
                                                },
                                                {
                                                    color: "#ff0000",
                                                    label: "Medium",
                                                },
                                                {
                                                    color: "#ffa500",
                                                    label: "High",
                                                },
                                                {
                                                    color: "#ffffff",
                                                    label: "Highest",
                                                    border: true,
                                                },
                                            ],
                                            viridis: [
                                                {
                                                    color: "#440154",
                                                    label: "Lowest",
                                                },
                                                {
                                                    color: "#31688e",
                                                    label: "Low",
                                                },
                                                {
                                                    color: "#35b779",
                                                    label: "Medium",
                                                },
                                                {
                                                    color: "#fde725",
                                                    label: "Highest",
                                                },
                                            ],
                                            classic: [
                                                {
                                                    color: "#6495ed",
                                                    label: "Lowest",
                                                },
                                                {
                                                    color: "#ffffff",
                                                    label: "Medium",
                                                    border: true,
                                                },
                                                {
                                                    color: "#dc1426",
                                                    label: "Highest",
                                                },
                                            ],
                                        }

                                        const currentLegend =
                                            legends[settings.colorScheme]
                                        return currentLegend.map(
                                            (item, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2"
                                                >
                                                    <div
                                                        className={`w-3 h-3 rounded-sm ${
                                                            item.border
                                                                ? "border border-gray-300"
                                                                : ""
                                                        }`}
                                                        style={{
                                                            backgroundColor:
                                                                item.color,
                                                        }}
                                                    />
                                                    <span className="text-sm">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            )
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </Tabs>

                {/* Compact Description with Learn More */}
                <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2">
                    <p className="text-sm text-gray-800">
                        {settings.visualizationType === "heatmap" &&
                            "2D grid showing vector dimensions with color intensity representing magnitude."}
                        {settings.visualizationType === "distribution" &&
                            "Bar chart showing how vector values are distributed across different ranges."}
                        {settings.visualizationType === "radial" &&
                            "Circular plot with distance from center showing dimension magnitudes."}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDescriptionOpen(true)}
                        className="gap-1 text-blue-700 hover:text-blue-900"
                    >
                        <Info className="h-3 w-3" />
                        Learn more...
                    </Button>
                </div>
            </DialogContent>

            {/* Learn More Description Dialog */}
            <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {settings.visualizationType === "heatmap" &&
                                "🔥 Heatmap Grid Visualization"}
                            {settings.visualizationType === "distribution" &&
                                "📊 Distribution Graph"}
                            {settings.visualizationType === "radial" &&
                                "⭕ Radial Plot"}
                        </DialogTitle>
                    </DialogHeader>

                    {settings.visualizationType === "heatmap" && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-800">
                                Displays vector dimensions as a 2D grid where
                                each cell represents one dimension.
                                <strong>
                                    {" "}
                                    Color intensity shows the magnitude
                                </strong>{" "}
                                of each dimension value.
                            </p>
                            <div>
                                <h4 className="font-medium mb-2">
                                    This visualization helps you:
                                </h4>
                                <ul className="text-sm text-gray-700 ml-4 list-disc space-y-1">
                                    <li>
                                        Identify which dimensions are most
                                        active (bright colors)
                                    </li>
                                    <li>
                                        Detect sparse vs dense vector regions
                                    </li>
                                    <li>
                                        Compare vectors visually by their "heat
                                        signatures"
                                    </li>
                                    <li>
                                        Spot patterns and clusters in your
                                        embedding space
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {settings.visualizationType === "distribution" && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-800">
                                Shows how your vector values are distributed
                                across different ranges.
                                <strong>
                                    {" "}
                                    Bar heights indicate frequency
                                </strong>{" "}
                                of values in each range.
                            </p>
                            <div>
                                <h4 className="font-medium mb-2">
                                    This visualization helps you:
                                </h4>
                                <ul className="text-sm text-gray-700 ml-4 list-disc space-y-1">
                                    <li>
                                        Understand the statistical properties of
                                        your embeddings
                                    </li>
                                    <li>
                                        Detect if vectors are normalized or have
                                        outliers
                                    </li>
                                    <li>
                                        Compare distribution shapes between
                                        different vectors
                                    </li>
                                    <li>
                                        Identify if your model outputs are
                                        behaving as expected
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {settings.visualizationType === "radial" && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-800">
                                Arranges vector dimensions in a circle where{" "}
                                <strong>
                                    distance from center shows magnitude
                                </strong>
                                and position shows the dimension index.
                            </p>
                            <div>
                                <h4 className="font-medium mb-2">
                                    This visualization helps you:
                                </h4>
                                <ul className="text-sm text-gray-700 ml-4 list-disc space-y-1">
                                    <li>
                                        See the overall "shape" or signature of
                                        your vector
                                    </li>
                                    <li>
                                        Quickly identify dominant dimensions
                                        sticking out
                                    </li>
                                    <li>
                                        Compare vector patterns in a compact
                                        circular view
                                    </li>
                                    <li>
                                        Spot symmetries or asymmetries in your
                                        embeddings
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}
