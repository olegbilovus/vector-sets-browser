import { EmbeddingDataFormat, EmbeddingProvider } from "@/lib/embeddings/types/embeddingModels"
import { Binary, ImageIcon, LetterText, Mic, BrainCircuit } from "lucide-react"
import { FC } from "react"

// Icon components for different embedding types
export const BinaryEmbeddingIcon: FC = () => (
    <div className="flex items-center gap-0 border border-slate-500 rounded-md p-1">
        <Binary className="h-3 w-3 text-slate-500" />
    </div>
)
export const TextEmbeddingIcon: FC = () => (
    <div className="flex items-center gap-0 border border-slate-500 rounded-md p-1">
        <LetterText className="h-3 w-3 text-slate-500" />
    </div>
)
export const ImageEmbeddingIcon: FC = () => (
    <div className="flex items-center gap-0 border border-slate-500 rounded-md p-1">
        <ImageIcon className="h-3 w-3 text-slate-500" />
    </div>
)
export const MultiModalEmbeddingIcon: FC = () => (
    <div className="flex items-center gap-0 border border-slate-500 rounded-md px-0.5">
        <LetterText className="h-3 w-3 text-slate-500" />
        +
        <ImageIcon className="h-3 w-3 text-slate-500" />
    </div>
)
export const AudioEmbeddingIcon: FC = () => (
    <Mic className="h-5 w-5 text-green-500" />
)

// Provider-specific icon components
export const OpenAIIcon: FC = () => (
    <div className="flex items-center justify-center w-5 h-5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="currentColor"/>
        </svg>
    </div>
)

export const OllamaIcon: FC = () => (
    <div className="flex items-center justify-center w-6 h-6">
        <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25.2 14.9c2.7-1.5 6.4-2 9.7 0 .7-8.8 9.7-11 8.4 4.6 5 3.8 4.1 10.8 2.2 13 2.2 4.1 1.6 8-.2 11.3a13 13 0 0 1 .9 7.1c-.3 1.6-2.7 1.2-2.6-.4.3-2 0-4.1-1-6.2-.2-.4-.2-1 .1-1.3 1-1.5 3-5.4 0-10-.4-.6-.2-1.4.4-1.8.8-.5 1.9-3 1-6.2-1.3-4.2-5-4.7-7-4.5-.6 0-1-.3-1.3-.8-2.6-5.6-10.2-3.8-11.6-.1-.2.5-.7.8-1.2.8-2.5 0-6 .7-7.1 4.6-.8 3 .3 5.7 1 6.3.5.4.6 1 .3 1.6-.8 1.2-2.8 6.2.1 9.9.3.5.4 1 .2 1.5-1.2 2.4-1.5 4.5-1.1 6 .3 1.7-2.2 2.3-2.6.7a12 12 0 0 1 1-7.1c-3.1-4.8-.9-10.2-.3-11.5-2.1-3-2.4-9.7 2.3-13-1.3-15.3 7.6-13.6 8.4-4.5M30 26.4c4 0 7 2.8 7 5.6 0 7-14.1 6.6-14.1 0 0-2.8 3.2-5.6 7.1-5.6M24.8 32c0 4.4 10.3 4.5 10.3 0 0-1.8-2-3.8-5-3.8-2.9 0-5.3 2-5.3 3.8zm6.5-.4-.6.4v1c0 1-1.5 1-1.5 0v-1l-.6-.4c-.6-.6.3-1.7 1-1.1l.4.3.4-.3c.8-.5 1.7.5.9 1.1zm-10.4-21c-2 .9-1.6 6.9-1.5 7.7.9-.3 1.8-.4 2.8-.5 1-1.9 0-6.4-1.3-7.2zm16.9 7.3c1 0 2 .1 3 .4 0-.9.5-7-1.5-7.7-1.2.3-2.5 5.7-1.5 7.3zm2.7 10.5c0 2.4-3.6 2.4-3.6 0s3.6-2.4 3.6 0zm-17.5 0c0 2.4-3.6 2.4-3.6 0s3.6-2.4 3.6 0z" fill="currentColor"/>
        </svg>
    </div>
)

export const TensorFlowIcon: FC = () => (
    <div className="flex items-center justify-center w-6 h-6">
        <svg width="24" height="24" viewBox="0 0 30.31081 32.499828" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(-77.942529,-177.00005)">
                <g>
                    <path
                        fill="#e55b2d"
                        d="m 360.04883,687.87305 v 18.89843 l 32.73047,18.89844 v -18.89844 z m -65.46289,18.89843 v 18.89844 l 16.36523,9.44727 V 716.2207 Z m 49.0957,9.44922 -16.36523,9.44922 v 56.69141 l 16.36523,9.44922 v -37.79493 l 16.36719,9.44922 v -18.89843 l -16.36719,-9.44922 z"
                        transform="scale(0.26458333)"
                    />
                    <path
                        fill="#ed8e24"
                        d="m 360.04883,687.87305 -49.09766,28.34765 v 18.89649 l 32.73047,-18.89649 v 18.89649 l 16.36719,-9.44727 z m 49.09765,9.44922 -16.36718,9.44921 v 18.89844 l 16.36718,-9.44922 z m -32.73242,37.79492 -16.36523,9.44922 v 18.89843 l 16.36523,-9.44922 z m -16.36523,28.34765 -16.36719,-9.44922 v 37.79493 l 16.36719,-9.44922 z"
                        transform="scale(0.26458333)"
                    />
                    <path
                        fill="#f8bf3c"
                        d="m 360.04883,668.97656 -65.46289,37.79492 16.36523,9.44922 49.09766,-28.34765 32.73047,18.89843 16.36718,-9.44921 z m 0,56.69336 -16.36719,9.44727 16.36719,9.44922 16.36523,-9.44922 z"
                        transform="scale(0.26458333)"
                    />
                </g>
            </g>
        </svg>
    </div>
)

export const TransformersIcon: FC = () => (
    <div className="flex items-center justify-center w-6 h-6">
        <BrainCircuit className="h-6 w-6" />
    </div>
)

// Helper function to get the appropriate icon based on data format
export function getEmbeddingIcon(dataFormat: EmbeddingDataFormat): FC {
    switch (dataFormat) {
        case "text-and-image":
            return MultiModalEmbeddingIcon
        case "image":
            return ImageEmbeddingIcon
        case "text":
            return TextEmbeddingIcon
        default:
            return BinaryEmbeddingIcon
    }
}

// Helper function to get provider-specific icons
export function getProviderIcon(provider: EmbeddingProvider): FC {
    switch (provider) {
        case "openai":
            return OpenAIIcon
        case "ollama":
            return OllamaIcon
        case "image":
            return TensorFlowIcon
        case "clip":
            return TransformersIcon
        case "none":
            return BinaryEmbeddingIcon
        default:
            return TextEmbeddingIcon
    }
}
