import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { VisualizationType } from "@/hooks/useVectorSettings"
import { Info } from "lucide-react"
import { useState } from "react"

interface VectorVisualizationInfoProps {
    visualizationType: VisualizationType
    canCompare: boolean
    showComparison: boolean
}

export default function VectorVisualizationInfo({
    visualizationType,
    canCompare,
    showComparison,
}: VectorVisualizationInfoProps) {
    const [descriptionOpen, setDescriptionOpen] = useState(false)

    const getDescription = () => {
        switch (visualizationType) {
            case "heatmap":
                return "2D grid showing vector dimensions with color intensity representing magnitude."
            case "distribution":
                return "Bar chart showing how vector values are distributed across different ranges."
            case "radial":
                return "Circular plot with distance from center showing dimension magnitudes."
            case "surface":
                return "3D surface plot with height representing vector values, creating peaks and valleys."
            default:
                return ""
        }
    }

    const getDetailedDescription = () => {
        switch (visualizationType) {
            case "heatmap":
                return {
                    title: "🔥 Heatmap Grid Visualization",
                    description: "Displays vector dimensions as a 2D grid where each cell represents one dimension. Color intensity shows the magnitude of each dimension value.",
                    benefits: [
                        "Identify which dimensions are most active (bright colors)",
                        "Detect sparse vs dense vector regions",
                        "Compare vectors visually by their \"heat signatures\"",
                        "Spot patterns and clusters in your embedding space",
                    ],
                }
            case "distribution":
                return {
                    title: "📊 Distribution Graph",
                    description: "Shows how your vector values are distributed across different ranges. Bar heights indicate frequency of values in each range.",
                    benefits: [
                        "Understand the statistical properties of your embeddings",
                        "Detect if vectors are normalized or have outliers",
                        "Compare distribution shapes between different vectors",
                        "Identify if your model outputs are behaving as expected",
                    ],
                }
            case "radial":
                return {
                    title: "⭕ Radial Plot",
                    description: "Arranges vector dimensions in a circle where distance from center shows magnitude and position shows the dimension index.",
                    benefits: [
                        "See the overall \"shape\" or signature of your vector",
                        "Quickly identify dominant dimensions sticking out",
                        "Compare vector patterns in a compact circular view",
                        "Spot symmetries or asymmetries in your embeddings",
                    ],
                }
            default:
                return {
                    title: "Vector Visualization",
                    description: "",
                    benefits: [],
                }
        }
    }

    const detailInfo = getDetailedDescription()

    return (
        <>
            <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2">
                <p className="text-sm text-gray-800">
                    {getDescription()}
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

            <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{detailInfo.title}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <p className="text-sm text-gray-800">
                            {detailInfo.description}
                        </p>
                        {detailInfo.benefits.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">
                                    This visualization helps you:
                                </h4>
                                <ul className="text-sm text-gray-700 ml-4 list-disc space-y-1">
                                    {detailInfo.benefits.map((benefit, index) => (
                                        <li key={index}>{benefit}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
