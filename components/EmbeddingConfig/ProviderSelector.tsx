import { 
    EmbeddingDataFormat, 
    EmbeddingProvider, 
    ProviderInfo,
    getAllProviders,
    getProviderInfo,
    getProvidersByDataFormat
} from "@/lib/embeddings/types/embeddingModels"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProviderIcon } from "./EmbeddingIcons"

interface ProviderSelectorProps {
    value: EmbeddingProvider
    onChange: (value: EmbeddingProvider) => void
    dataFormat?: EmbeddingDataFormat
}

// Returns the appropriate icon component for a provider
function getProviderIconComponent(provider: ProviderInfo) {
    const IconComponent = getProviderIcon(provider.id)
    return <IconComponent />
}

export default function ProviderSelector({
    value,
    onChange,
    dataFormat,
}: ProviderSelectorProps) {
    const currentProvider = getProviderInfo(value)
    const availableProviders = dataFormat 
        ? getProvidersByDataFormat(dataFormat)
        : getAllProviders()

    return (
        <Select
            value={value}
            onValueChange={(value: EmbeddingProvider) => onChange(value)}
        >
            <SelectTrigger className="w-full h-18">
                <SelectValue placeholder="Select provider">
                    {value && (
                        <div className="flex items-center gap-2">
                            {getProviderIconComponent(currentProvider)}
                            <span>
                                {currentProvider.displayName}
                                {currentProvider.isBuiltIn && " (Built-in)"}
                            </span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-full">
                {availableProviders.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                            {getProviderIconComponent(provider)}
                            <div className="flex flex-col items-start">
                                <div className="font-medium">
                                    {provider.displayName}
                                    {provider.isBuiltIn && " (Built-in)"}
                                </div>
                                <div className="text-gray-500">
                                    {provider.description}
                                </div>
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
} 