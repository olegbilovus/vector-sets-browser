import { 
    ModelData, 
    EmbeddingProvider,
    getModelsByProvider
} from "@/lib/embeddings/types/embeddingModels"
import { defaultOllamaUrl } from "@/lib/embeddings/utils"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as React from "react"

// Hook to fetch available Ollama models
function useOllamaModels(apiUrl: string) {
    const [models, setModels] = React.useState<string[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const fetchModels = React.useCallback(async () => {
        if (!apiUrl) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`${apiUrl}/api/tags`)
            if (response.ok) {
                const data = await response.json()
                const modelNames = data.models?.map((m: any) => m.name) || []
                setModels(modelNames)
            } else {
                setError("Could not fetch model list from Ollama")
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to connect to Ollama")
        } finally {
            setIsLoading(false)
        }
    }, [apiUrl])

    React.useEffect(() => {
        fetchModels()
    }, [fetchModels])

    return { models, isLoading, error, refetch: fetchModels }
}

interface ModelSelectorProps {
    provider: EmbeddingProvider
    value: string
    onChange: (value: string) => void
    allowCustom?: boolean
    ollamaApiUrl?: string // Add this prop for Ollama API URL
}

export default function ModelSelector({
    provider,
    value,
    onChange,
    allowCustom = false,
    ollamaApiUrl
}: ModelSelectorProps) {
    const [customModel, setCustomModel] = React.useState("")
    const models = getModelsByProvider(provider)
    
    // Use dynamic Ollama models if provider is ollama
    const { 
        models: ollamaModels, 
        isLoading: ollamaLoading, 
        error: ollamaError, 
        refetch: refetchOllamaModels 
    } = useOllamaModels(provider === "ollama" ? (ollamaApiUrl || defaultOllamaUrl()) : "")

    // Determine if we should use dynamic models (for Ollama) or static models
    const availableModels = provider === "ollama" ? ollamaModels : models.map(m => m.id)
    const isCustom = allowCustom && !availableModels.includes(value)

    React.useEffect(() => {
        if (isCustom) {
            setCustomModel(value)
        }
    }, [isCustom, value])

    // Different providers use different UI components
    if (provider === "image") {
        return <ImageModelDisplay models={models} value={value} onChange={onChange} />
    }

    // For Ollama, show dynamic model selection
    if (provider === "ollama") {
        return (
            <div className="space-y-4">
                {ollamaError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                            <span>{ollamaError}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refetchOllamaModels}
                                disabled={ollamaLoading}
                            >
                                <RefreshCw className={`h-3 w-3 ${ollamaLoading ? "animate-spin" : ""}`} />
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center gap-2">
                    <Select
                        value={isCustom ? "custom" : value}
                        onValueChange={(val) => {
                            if (val === "custom") {
                                onChange(customModel || "")
                            } else {
                                onChange(val)
                            }
                        }}
                        disabled={ollamaLoading}
                    >
                        <SelectTrigger className="w-full text-left h-12">
                            <SelectValue placeholder={ollamaLoading ? "Loading models..." : "Select a model"} />
                        </SelectTrigger>
                        <SelectContent>
                            {ollamaModels.map((modelName) => {
                                // Extract base model name (everything before the first colon for display)
                                const baseModelName = modelName.split(':')[0]
                                const displayName = baseModelName.charAt(0).toUpperCase() + baseModelName.slice(1)
                                
                                return (
                                    <SelectItem key={modelName} value={modelName}>
                                        <div className="flex flex-col">
                                            <div className="font-medium">
                                                {displayName}
                                                {modelName.includes(':') && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        ({modelName.split(':')[1]})
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Available locally in Ollama
                                            </p>
                                        </div>
                                    </SelectItem>
                                )
                            })}
                            {allowCustom && (
                                <SelectItem value="custom">
                                    <div className="flex flex-col py-2">
                                        <div className="font-medium">Custom Model</div>
                                        <p className="text-xs text-muted-foreground">
                                            Use a model not yet pulled locally
                                        </p>
                                    </div>
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refetchOllamaModels}
                        disabled={ollamaLoading}
                        title="Refresh model list"
                    >
                        <RefreshCw className={`h-4 w-4 ${ollamaLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                {isCustom && (
                    <div className="space-y-2">
                        <Input
                            value={customModel}
                            onChange={(e) => {
                                setCustomModel(e.target.value)
                                onChange(e.target.value)
                            }}
                            placeholder="Enter model name (e.g., mxbai-embed-large)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter the name of a model. If it&apos;s not pulled locally, you&apos;ll need to run <code className="bg-slate-200 px-1 rounded">ollama pull {customModel}</code>
                        </p>
                    </div>
                )}

                {ollamaModels.length === 0 && !ollamaLoading && !ollamaError && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            No models found. Make sure Ollama is running and you have pulled at least one embedding model.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        )
    }

    // For other providers with many options, use a select
    return (
        <div className="space-y-4">
            <Select
                value={isCustom ? "custom" : value}
                onValueChange={(val) => {
                    if (val === "custom") {
                        onChange(customModel || "")
                    } else {
                        onChange(val)
                    }
                }}
            >
                <SelectTrigger className="w-full text-left h-12">
                    <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                    {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                                <div className="font-medium">
                                    {model.name}
                                    {model.size && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            ({model.size})
                                        </span>
                                    )}
                                    {model.isLegacy && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            (Legacy)
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {model.description}
                                    {model.dimensions && (
                                        <span className="ml-1">
                                            ({model.dimensions} dimensions)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </SelectItem>
                    ))}
                    {allowCustom && (
                        <SelectItem value="custom">
                            <div className="flex flex-col py-2">
                                <div className="font-medium">Custom Model</div>
                                <p className="text-xs text-muted-foreground">
                                    Use a custom model not in the list
                                </p>
                            </div>
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>

            {isCustom && (
                <div className="space-y-2">
                    <Input
                        value={customModel}
                        onChange={(e) => {
                            setCustomModel(e.target.value)
                            onChange(e.target.value)
                        }}
                        placeholder="Enter custom model name"
                    />
                    <p className="text-xs text-muted-foreground">
                        Enter the name of any other model you have installed locally
                    </p>
                </div>
            )}
        </div>
    )
}

// Special display for image models using radio buttons
function ImageModelDisplay({ models, value, onChange }: { 
    models: ModelData[], 
    value: string, 
    onChange: (value: string) => void 
}) {
    const handleChange = (newValue: string) => {
        onChange(newValue)
    }

    const selectedModel = models.find(m => m.id === value) || models[0]

    return (
        <div className="space-y-4">
            <RadioGroup value={value} onValueChange={handleChange}>
                {models.map((model) => (
                    <div
                        key={model.id}
                        className="flex items-start space-x-3 p-2"
                    >
                        <RadioGroupItem value={model.id} id={model.id} />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor={model.id} className="font-medium">
                                {model.name}
                            </Label>
                            <p className="text-sm text-gray-500">
                                {model.description}
                            </p>
                        </div>
                    </div>
                ))}
            </RadioGroup>
            <p className="text-xs text-gray-500">
                Selected model outputs{" "}
                {selectedModel?.dimensions || 1024}-dimensional embeddings
            </p>
        </div>
    )
} 