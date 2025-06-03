import { Button } from "@/components/ui/button"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, X } from "lucide-react"

interface VectorHeatmapHeaderProps {
    canCompare: boolean
    showComparison: boolean
    onComparisonToggle: () => void
    onDownload: () => void
    onMakeDefault: () => void
    onClose: () => void
    vectorSetName?: string | null
    isImageBased: boolean
}

export default function VectorHeatmapHeader({
    canCompare,
    showComparison,
    onComparisonToggle,
    onDownload,
    onMakeDefault,
    onClose,
    vectorSetName,
    isImageBased,
}: VectorHeatmapHeaderProps) {
    return (
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
                        onClick={onComparisonToggle}
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
                        onClick={onMakeDefault}
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
                    onClick={onDownload}
                >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </DialogHeader>
    )
}
