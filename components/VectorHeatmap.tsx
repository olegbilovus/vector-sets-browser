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
import { userSettings } from "@/lib/storage/userSettings"

interface VectorHeatmapProps {
    vector: number[] | null
    open: boolean
    onOpenChange: (open: boolean) => void
    vectorSetName?: string | null
    metadata?: VectorSetMetadata | null
    searchVector?: number[] | null
    elementName?: string | null
    searchQuery?: string | null
    lastSearchDisplayName?: string | null
}

export default function VectorHeatmap({
    vector,
    open,
    onOpenChange,
    vectorSetName = null,
    metadata = null,
    searchVector = null,
    elementName = null,
    searchQuery = null,
    lastSearchDisplayName = null,
}: VectorHeatmapProps) {
    const [forceRender, setForceRender] = useState(0)
    const [descriptionOpen, setDescriptionOpen] = useState(false)
    const [showComparison, setShowComparison] = useState(false)
    const {
        settings,
        setColorScheme,
        setScalingMode,
        setVisualizationType,
        isImageBased,
        resetToDefaults,
        makeDefault,
    } = useVectorSettings(vectorSetName, metadata)

    const canCompare =
        vector && searchVector && vector.length === searchVector.length

    useEffect(() => {
        if (open) {
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
        showComparison,
    ])

    useEffect(() => {
        if (open && canCompare) {
            const stickyComparison =
                userSettings.get("vectorComparisonMode") === true
            setShowComparison(stickyComparison)
        } else if (open) {
            setShowComparison(false)
        }
    }, [open, canCompare])

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

    const downloadVisualization = () => {
        const canvases = document.querySelectorAll(
            ".vector-visualization canvas"
        ) as NodeListOf<HTMLCanvasElement>

        if (canvases.length === 0) return

        if (showComparison && canvases.length >= 2) {
            const searchCanvas = canvases[0]
            const resultCanvas = canvases[1]

            const searchLink = document.createElement("a")
            searchLink.download = `search-vector-${settings.visualizationType}.png`
            searchLink.href = searchCanvas.toDataURL("image/png")
            searchLink.click()

            setTimeout(() => {
                const resultLink = document.createElement("a")
                resultLink.download = `${elementName || "result"}-vector-${
                    settings.visualizationType
                }.png`
                resultLink.href = resultCanvas.toDataURL("image/png")
                resultLink.click()
            }, 100)
        } else {
            const canvas = canvases[0]
            const link = document.createElement("a")
            link.download = `vector-${settings.visualizationType}.png`
            link.href = canvas.toDataURL("image/png")
            link.click()
        }
    }

    const handleComparisonToggle = () => {
        const newValue = !showComparison
        setShowComparison(newValue)
        userSettings.set("vectorComparisonMode", newValue)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle>
                        Vector Visualization
                        {showComparison && canCompare && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                                - Comparison View
                            </span>
                        )}
                    </DialogTitle>
                    <div className="flex gap-2">
                        {canCompare && (
                            <Button
                                variant={showComparison ? "default" : "outline"}
                                size="sm"
                                onClick={handleComparisonToggle}
                                className="text-xs px-3 py-1"
                                title={`${
                                    showComparison ? "Hide" : "Show"
                                } side-by-side comparison`}
                            >
                                {showComparison
                                    ? "Hide Comparison"
                                    : "Compare Side by Side"}
                            </Button>
                        )}
                        {vectorSetName && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMakeDefault}
                                className="text-xs px-2 py-1"
                                title={`Make these settings the default for all ${
                                    isImageBased ? "image/multimodal" : "text"
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

                    {showComparison && canCompare ? (
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
                                        key={`search-${settings.colorScheme}-${settings.scalingMode}-${settings.visualizationType}-${forceRender}`}
                                    >
                                        <VectorVisualizationRenderer
                                            vector={searchVector}
                                            showStats={false}
                                            size={350}
                                            colorScheme={settings.colorScheme}
                                            scalingMode={settings.scalingMode}
                                            visualizationType={
                                                settings.visualizationType
                                            }
                                        />
                                    </div>
                                    {searchVector &&
                                        searchVector.length > 0 && (
                                            <div className="border rounded-lg p-3 bg-slate-50">
                                                <h4 className="font-medium mb-3">
                                                    Statistics
                                                </h4>
                                                <div className="text-sm space-y-2">
                                                    <div className="flex justify-between">
                                                        <span>Dimensions:</span>
                                                        <span className="font-mono">
                                                            {
                                                                searchVector.length
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Range:</span>
                                                        <span className="font-mono">
                                                            {Math.min(
                                                                ...searchVector
                                                            ).toFixed(4)}{" "}
                                                            to{" "}
                                                            {Math.max(
                                                                ...searchVector
                                                            ).toFixed(4)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Average:</span>
                                                        <span className="font-mono">
                                                            {(
                                                                searchVector.reduce(
                                                                    (
                                                                        sum,
                                                                        val
                                                                    ) =>
                                                                        sum +
                                                                        val,
                                                                    0
                                                                ) /
                                                                searchVector.length
                                                            ).toFixed(4)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Non-zero:</span>
                                                        <span className="font-mono">
                                                            {
                                                                searchVector.filter(
                                                                    (v) =>
                                                                        v !== 0
                                                                ).length
                                                            }{" "}
                                                            (
                                                            {(
                                                                (searchVector.filter(
                                                                    (v) =>
                                                                        v !== 0
                                                                ).length /
                                                                    searchVector.length) *
                                                                100
                                                            ).toFixed(1)}
                                                            %)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
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
                                        key={`result-${settings.colorScheme}-${settings.scalingMode}-${settings.visualizationType}-${forceRender}`}
                                    >
                                        <VectorVisualizationRenderer
                                            vector={vector}
                                            showStats={false}
                                            size={350}
                                            colorScheme={settings.colorScheme}
                                            scalingMode={settings.scalingMode}
                                            visualizationType={
                                                settings.visualizationType
                                            }
                                        />
                                    </div>
                                    {vector && vector.length > 0 && (
                                        <div className="border rounded-lg p-3 bg-slate-50">
                                            <h4 className="font-medium mb-3">
                                                Statistics
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
                                                        {Math.min(
                                                            ...vector
                                                        ).toFixed(4)}{" "}
                                                        to{" "}
                                                        {Math.max(
                                                            ...vector
                                                        ).toFixed(4)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Average:</span>
                                                    <span className="font-mono">
                                                        {(
                                                            vector.reduce(
                                                                (sum, val) =>
                                                                    sum + val,
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
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 bg-slate-50">
                                <h4 className="font-medium mb-3">
                                    Visualization Controls
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <ColorSchemeSelector
                                            value={settings.colorScheme}
                                            onChange={setColorScheme}
                                            showPreview={false}
                                        />
                                    </div>
                                    <div>
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
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-6">
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

                            <div className="w-72 space-y-4">
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
                                                    {Math.min(
                                                        ...vector
                                                    ).toFixed(4)}{" "}
                                                    to{" "}
                                                    {Math.max(
                                                        ...vector
                                                    ).toFixed(4)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Average:</span>
                                                <span className="font-mono">
                                                    {(
                                                        vector.reduce(
                                                            (sum, val) =>
                                                                sum + val,
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

                                <div className="border rounded-lg p-3 bg-slate-50">
                                    <h4 className="font-medium mb-3">
                                        Legend & Colors
                                    </h4>

                                    <div className="mb-4">
                                        <ColorSchemeSelector
                                            value={settings.colorScheme}
                                            onChange={setColorScheme}
                                            showPreview={false}
                                        />
                                    </div>

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
                    )}
                </Tabs>

                <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2">
                    <p className="text-sm text-gray-800">
                        {settings.visualizationType === "heatmap" &&
                            "2D grid showing vector dimensions with color intensity representing magnitude."}
                        {settings.visualizationType === "distribution" &&
                            "Bar chart showing how vector values are distributed across different ranges."}
                        {settings.visualizationType === "radial" &&
                            "Circular plot with distance from center showing dimension magnitudes."}
                        {canCompare && !showComparison && (
                            <span className="text-blue-700 font-medium ml-2">
                                • Use "Compare Side by Side" to compare vectors
                            </span>
                        )}
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
