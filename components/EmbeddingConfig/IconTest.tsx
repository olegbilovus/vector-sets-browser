import { FC } from "react"
import { OpenAIIcon, OllamaIcon, getProviderIcon } from "./EmbeddingIcons"
import { EmbeddingProvider } from "@/lib/embeddings/types/embeddingModels"

// Test component to verify provider icons are working
export const IconTest: FC = () => {
    const providers: EmbeddingProvider[] = ["openai", "ollama", "image", "clip", "none"]
    
    return (
        <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold">Provider Icons Test</h2>
            
            <div className="space-y-2">
                <h3 className="font-semibold">Direct Icon Components:</h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <OpenAIIcon />
                        <span>OpenAI</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <OllamaIcon />
                        <span>Ollama</span>
                    </div>
                </div>
            </div>
            
            <div className="space-y-2">
                <h3 className="font-semibold">getProviderIcon Function:</h3>
                <div className="flex flex-wrap gap-4">
                    {providers.map(provider => {
                        const IconComponent = getProviderIcon(provider)
                        return (
                            <div key={provider} className="flex items-center gap-2 p-2 border rounded">
                                <IconComponent />
                                <span className="capitalize">{provider}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
} 