"use client"

import OpenAIKeyManager from "../../components/OpenAIKeyManager"
import CacheManager from "./CacheManager"
import AnimationSettings from "./AnimationSettings"
import OllamaInfoPanel from "../vectorset/components/SettingsTab/OllamaInfoPanel"
import { DEFAULT_EMBEDDING_CONFIG } from "../vectorset/utils/constants"

export default function ConfigPage() {
    return (
        <div className="container mx-auto py-4 space-y-4">
            <h1 className="text-3xl font-bold">Settings</h1>

            <div className="grid grid-cols-1 gap-4">
                <AnimationSettings />
                <OllamaInfoPanel config={DEFAULT_EMBEDDING_CONFIG} />
                <OpenAIKeyManager />
                <CacheManager />

                {/* Add more configuration sections here as needed */}
            </div>
        </div>
    )
}
