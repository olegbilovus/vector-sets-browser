import {
    EmbeddingConfig,
    EmbeddingDataFormat,
    getModelName,
} from "@/services/embeddings/types/embeddingModels"
import { Image as ImageIcon, LetterText } from "lucide-react"
import { getProviderIcon } from "@/components/EmbeddingConfig/EmbeddingIcons"

interface EmbeddingProcessVisualizationProps {
    dataFormat: EmbeddingDataFormat
    config: EmbeddingConfig
    dimensions: number
}

export default function EmbeddingProcessVisualization({
    dataFormat,
    config,
    dimensions,
}: EmbeddingProcessVisualizationProps) {
    const getInputTypeLabel = (format: EmbeddingDataFormat) => {
        switch (format) {
            case "text":
                return "Input Data: Text"
            case "image":
                return "Input Data: Image"
            case "text-and-image":
                return "Multi-modal Input"
            default:
                return "Input"
        }
    }

    const getModelDisplayName = (config: EmbeddingConfig) => {
        const modelName = getModelName(config)
        return `${modelName}`
    }

    // Get the provider-specific icon component
    const ProviderIconComponent = getProviderIcon(config.provider)

    return (
        <div className="flex items-center justify-center mt-4 mb-2 p-8 bg-slate-50 rounded-md">
            <div className="flex items-center space-x-2">
                {/* Input side */}
                <div className="flex flex-col items-center">
                    {dataFormat === "text" && (
                        <div className="p-2 bg-white rounded-md border border-slate-200 w-24 h-24 flex items-center justify-center">
                            <LetterText className="h-10 w-10 text-blue-500" />
                        </div>
                    )}
                    {dataFormat === "image" && (
                        <div className="p-2 bg-white rounded-md border border-slate-200 w-24 h-24 flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-purple-500" />
                        </div>
                    )}
                    {dataFormat === "text-and-image" && (
                        <div className="p-2 bg-white rounded-md border border-slate-200 w-24 h-24 flex flex-col items-center justify-center">
                            <LetterText className="h-6 w-6 text-blue-500" />
                            <div className="text-xs font-semibold">+</div>
                            <ImageIcon className="h-6 w-6 text-purple-500" />
                        </div>
                    )}
                    <div className="text-xs font-medium mt-1 text-slate-600 text-center max-w-20 whitespace-nowrap">
                        Input Data:
                        <div className="font-bold">
                            {getInputTypeLabel(dataFormat).replace(
                                "Input Data: ",
                                ""
                            )}
                        </div>
                        <div></div>
                    </div>
                </div>

                {/* Animated Arrow */}
                <div className="flex flex-col items-center">
                    <svg
                        width="40"
                        height="24"
                        viewBox="0 0 40 24"
                        className="text-slate-400"
                    >
                        <defs>
                            <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3">
                                    <animate attributeName="stop-opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
                                </stop>
                                <stop offset="50%" stopColor="currentColor" stopOpacity="0.8">
                                    <animate attributeName="stop-opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="0.2s" />
                                </stop>
                                <stop offset="100%" stopColor="currentColor" stopOpacity="0.3">
                                    <animate attributeName="stop-opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
                                </stop>
                            </linearGradient>
                        </defs>
                        <path
                            d="M32 12H8M32 12L26 6M32 12L26 18"
                            stroke="url(#flowGradient1)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                        {/* Flowing dot */}
                        <circle r="2" fill="currentColor" opacity="0.8">
                            <animateMotion dur="1.5s" repeatCount="indefinite" path="M8,12 L32,12" />
                        </circle>
                    </svg>
                </div>

                {/* Model */}
                <div className="flex flex-col items-center">
                    <div className="p-2 bg-white rounded-md border border-slate-200 w-24 h-24 flex items-center justify-center">
                        <div className="text-indigo-500 scale-150">
                            <ProviderIconComponent />
                        </div>
                    </div>
                    <div className="text-xs font-medium mt-1 text-slate-600 text-center max-w-24 whitespace-nowrap">
                        Embedding Model:
                        <div className="font-bold">
                            {getModelDisplayName(config)}
                        </div>
                        <div></div>
                    </div>
                </div>

                {/* Animated Arrow */}
                <div className="flex flex-col items-center">
                    <svg
                        width="40"
                        height="24"
                        viewBox="0 0 40 24"
                        className="text-slate-400"
                    >
                        <defs>
                            <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3">
                                    <animate attributeName="stop-opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                                </stop>
                                <stop offset="50%" stopColor="currentColor" stopOpacity="0.8">
                                    <animate attributeName="stop-opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="0.7s" />
                                </stop>
                                <stop offset="100%" stopColor="currentColor" stopOpacity="0.3">
                                    <animate attributeName="stop-opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.9s" />
                                </stop>
                            </linearGradient>
                        </defs>
                        <path
                            d="M32 12H8M32 12L26 6M32 12L26 18"
                            stroke="url(#flowGradient2)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                        {/* Flowing dot */}
                        <circle r="2" fill="currentColor" opacity="0.8">
                            <animateMotion dur="1.5s" repeatCount="indefinite" path="M8,12 L32,12" begin="0.5s" />
                        </circle>
                    </svg>
                </div>

                {/* Output side (vector) */}
                <div className="flex flex-col items-center">
                    <div className="p-2 bg-white rounded-md border border-slate-200 w-24 h-24 flex items-center justify-center">
                        <div className="text-[8px] font-mono text-slate-800 flex flex-col items-center">
                            <span>
                                [0.23, 0.85, -0.12, 0.67, -0.34, 0.91. -0.14,
                                0.98, -0.34, ...]
                            </span>
                        </div>
                    </div>
                    <div className="text-xs font-medium mt-1 text-slate-600 text-center whitespace-nowrap">
                        Output Data:
                        <div className="font-bold">
                            Vector ({dimensions} dim)
                        </div>
                        <div></div>
                    </div>
                </div>
            </div>
        </div>
    )
} 