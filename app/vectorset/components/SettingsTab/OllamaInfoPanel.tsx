import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { defaultOllamaUrl, isOllamaAvailable } from "@/lib/embeddings/utils"
import { EmbeddingConfig } from "@/lib/embeddings/types/embeddingModels"
import {
    CheckCircle,
    XCircle,
    ExternalLink,
    Download,
    Terminal,
    RefreshCw,
    AlertTriangle,
    Info,
} from "lucide-react"
import { useEffect, useState } from "react"

interface OllamaInfoPanelProps {
    config: EmbeddingConfig
}

interface OllamaStatus {
    isAvailable: boolean
    isLoading: boolean
    error?: string
    models?: string[]
}

export default function OllamaInfoPanel({ config }: OllamaInfoPanelProps) {
    const [status, setStatus] = useState<OllamaStatus>({
        isAvailable: false,
        isLoading: true,
    })

    const ollamaUrl = config.ollama?.apiUrl || defaultOllamaUrl()
    const modelName = config.ollama?.modelName || "mxbai-embed-large"

    const checkOllamaStatus = async () => {
        setStatus((prev) => ({ ...prev, isLoading: true, error: undefined }))

        try {
            // Check if Ollama is available
            const available = await isOllamaAvailable()

            if (available) {
                // If available, try to get the list of models
                try {
                    const response = await fetch(`${ollamaUrl}/api/tags`)
                    if (response.ok) {
                        const data = await response.json()
                        const models = data.models?.map((m: any) => m.name) || []
                        setStatus({
                            isAvailable: true,
                            isLoading: false,
                            models,
                        })
                    } else {
                        setStatus({
                            isAvailable: true,
                            isLoading: false,
                            error: "Could not fetch model list",
                        })
                    }
                } catch (error) {
                    setStatus({
                        isAvailable: true,
                        isLoading: false,
                        error: "Could not fetch model list",
                    })
                }
            } else {
                setStatus({
                    isAvailable: false,
                    isLoading: false,
                })
            }
        } catch (error) {
            setStatus({
                isAvailable: false,
                isLoading: false,
                error: error instanceof Error ? error.message : "Unknown error",
            })
        }
    }

    useEffect(() => {
        checkOllamaStatus()
    }, [ollamaUrl])

    // Check if the model is available, accounting for version tags (e.g., "model:latest")
    const isModelAvailable = status.models?.some(model => {
        // Extract base model name (everything before the first colon)
        const baseModelName = model.split(':')[0]
        return baseModelName === modelName || model === modelName
    })

    return (
        <Card className="mt-4">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Ollama Status
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={checkOllamaStatus}
                        disabled={status.isLoading}
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                                status.isLoading ? "animate-spin" : ""
                            }`}
                        />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        {status.isLoading ? (
                            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                        ) : status.isAvailable ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                            <div className="font-medium">
                                {status.isLoading
                                    ? "Checking connection..."
                                    : status.isAvailable
                                    ? "Connected"
                                    : "Not connected"}
                            </div>
                            <div className="text-sm text-slate-600">
                                {ollamaUrl}
                            </div>
                        </div>
                    </div>
                    <Badge
                        variant={
                            status.isLoading
                                ? "secondary"
                                : status.isAvailable
                                ? "default"
                                : "destructive"
                        }
                    >
                        {status.isLoading
                            ? "Checking"
                            : status.isAvailable
                            ? "Online"
                            : "Offline"}
                    </Badge>
                </div>

                {/* Model Status */}
                {status.isAvailable && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">Selected Model</div>
                            <Badge
                                variant={
                                    isModelAvailable ? "default" : "secondary"
                                }
                            >
                                {isModelAvailable ? "Available" : "Not pulled"}
                            </Badge>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                            {modelName}
                        </div>
                        {!isModelAvailable && (
                            <Alert className="mt-2">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    This model is not available locally. Run{" "}
                                    <code className="bg-slate-200 px-1 rounded">
                                        ollama pull {modelName}
                                    </code>{" "}
                                    to download it.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {status.error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{status.error}</AlertDescription>
                    </Alert>
                )}

                {/* Setup Instructions */}
                {!status.isAvailable && (
                    <div className="space-y-4">
                        <Alert>
                            <Download className="h-4 w-4" />
                            <AlertTitle>Ollama Not Found</AlertTitle>
                            <AlertDescription>
                                Ollama is not running or not installed. Follow
                                the steps below to get started.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <div className="font-medium">Setup Instructions:</div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <div className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                                        1
                                    </div>
                                    <div>
                                        <div className="font-medium">
                                            Download Ollama
                                        </div>
                                        <div className="text-slate-600">
                                            Visit the official website to
                                            download Ollama for your platform
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() =>
                                                window.open(
                                                    "https://ollama.ai",
                                                    "_blank"
                                                )
                                            }
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Download Ollama
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <div className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                                        2
                                    </div>
                                    <div>
                                        <div className="font-medium">
                                            Start Ollama
                                        </div>
                                        <div className="text-slate-600 mb-2">
                                            After installation, start the Ollama
                                            service
                                        </div>
                                        <div className="bg-slate-100 p-2 rounded font-mono text-xs">
                                            ollama serve
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <div className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                                        3
                                    </div>
                                    <div>
                                        <div className="font-medium">
                                            Pull the embedding model
                                        </div>
                                        <div className="text-slate-600 mb-2">
                                            Download the required embedding model
                                        </div>
                                        <div className="bg-slate-100 p-2 rounded font-mono text-xs">
                                            ollama pull {modelName}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm">
                                <div className="font-medium text-blue-800 mb-1">
                                    Default Configuration
                                </div>
                                <div className="text-blue-700">
                                    Ollama runs on{" "}
                                    <code className="bg-blue-100 px-1 rounded">
                                        {defaultOllamaUrl()}
                                    </code>{" "}
                                    by default. If you're running it on a
                                    different port or host, you can change the
                                    API URL in the embedding configuration.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Available Models List */}
                {status.isAvailable && status.models && status.models.length > 0 && (
                    <div className="space-y-2">
                        <div className="font-medium">Available Models:</div>
                        <div className="max-h-32 overflow-y-auto">
                            <div className="space-y-1">
                                {status.models.map((model) => {
                                    // Check if this model matches the selected one (accounting for version tags)
                                    const baseModelName = model.split(':')[0]
                                    const isSelected = baseModelName === modelName || model === modelName
                                    
                                    return (
                                        <div
                                            key={model}
                                            className={`text-sm p-2 rounded ${
                                                isSelected
                                                    ? "bg-blue-100 text-blue-800 font-medium"
                                                    : "bg-slate-100 text-slate-700"
                                            }`}
                                        >
                                            {model}
                                            {isSelected && (
                                                <Badge
                                                    variant="default"
                                                    className="ml-2 text-xs"
                                                >
                                                    Selected
                                                </Badge>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 