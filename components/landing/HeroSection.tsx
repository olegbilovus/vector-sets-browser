"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

// lucide-react dropped its brand icons in v1, so the GitHub mark is inlined
// here rather than pulling in another icon dependency for a single glyph.
function GithubIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 .5C5.73.5.67 5.58.67 11.85c0 5.02 3.24 9.27 7.74 10.77.57.11.78-.24.78-.54v-1.9c-3.15.69-3.81-1.52-3.81-1.52-.52-1.32-1.26-1.67-1.26-1.67-1.03-.71.08-.69.08-.69 1.14.08 1.74 1.18 1.74 1.18 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.53-2.52-.29-5.16-1.26-5.16-5.62 0-1.24.44-2.25 1.17-3.05-.12-.29-.51-1.45.11-3.01 0 0 .96-.31 3.14 1.16a10.9 10.9 0 0 1 2.86-.39c.97 0 1.95.13 2.86.39 2.18-1.47 3.14-1.16 3.14-1.16.62 1.56.23 2.72.11 3.01.73.8 1.17 1.81 1.17 3.05 0 4.37-2.65 5.33-5.18 5.61.41.35.77 1.05.77 2.12v3.14c0 .3.21.66.79.54a11.19 11.19 0 0 0 7.73-10.77C23.33 5.58 18.27.5 12 .5Z" />
        </svg>
    )
}

export function HeroSection() {
    return (
        <section className="container py-6 md:py-12 lg:py-14">
            <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
                <h1 className="text-3xl font-bold text-center leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
                    Store, Search, and Retrieve{" "}
                    <span className="text-red-500">Vector Data</span> with
                    Redis
                </h1>
                <p className="max-w-[750px] text-lg text-muted-foreground md:text-xl">
                    Seamlessly integrate vector search capabilities into
                    your applications with Redis Vector Sets. Fast,
                    scalable, and easy to use for text, image, and audio
                    embeddings.
                </p>
                <p className="max-w-[750px] text-lg md:text-xl">
                    The Speed you need, the API you love.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Button size="lg" asChild>
                        <Link href="/console">
                            Get Started
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                        <Link href="https://github.com/redis/redis-vector-sets">
                            <GithubIcon className="mr-2 h-4 w-4" />
                            View on GitHub
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
} 