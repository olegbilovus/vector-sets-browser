"use client"

import OpenAIKeyManager from "../../components/OpenAIKeyManager"
import CacheManager from "./CacheManager"
import OllamaInfoPanel from "../vectorset/components/SettingsTab/OllamaInfoPanel"
import { DEFAULT_EMBEDDING_CONFIG } from "../vectorset/utils/constants"

export default function ConfigPage() {
    return (
        <div className="container mx-auto py-10 space-y-8">
            <h1 className="text-3xl font-bold">Configuration</h1>

            <div className="grid grid-cols-1 gap-8">
                <OpenAIKeyManager />
                <OllamaInfoPanel config={DEFAULT_EMBEDDING_CONFIG} />
                <CacheManager />

                {/* Add more configuration sections here as needed */}
            </div>
        </div>
    )
}
