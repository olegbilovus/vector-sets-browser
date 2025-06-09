import React, { useRef, useState, useMemo, useCallback } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import * as THREE from "three"

interface Vector3DSurfaceRendererProps {
    vector: number[] | null
    className?: string
    size?: number
    showStats?: boolean
    scalingMode?: 'relative' | 'absolute'
    colorScheme?: 'thermal' | 'viridis' | 'classic'
    noPadding?: boolean
}

interface HoverInfo {
    dimension: number
    value: number
    position: [number, number, number]
    screenPosition: [number, number]
}

// Surface mesh component that handles the 3D geometry and interactions
function SurfaceMesh({
    vector,
    scalingMode,
    colorScheme,
    showStats,
    onHover,
    onHeightScaleChange
}: {
    vector: number[]
    scalingMode: 'relative' | 'absolute'
    colorScheme: 'thermal' | 'viridis' | 'classic'
    showStats: boolean
    onHover: (info: HoverInfo | null) => void
    onHeightScaleChange: (scale: number) => void
}) {
    const meshRef = useRef<THREE.Mesh>(null)
    const { camera, raycaster, pointer, gl } = useThree()

    // Calculate grid dimensions
    const gridDimensions = useMemo(() => {
        const cols = Math.ceil(Math.sqrt(vector.length))
        const rows = Math.ceil(vector.length / cols)
        return { cols, rows }
    }, [vector.length])

    // Get scaling parameters
    const scalingParams = useMemo(() => {
        if (scalingMode === 'absolute') {
            return { min: -1, max: 1, range: 2 }
        } else {
            const min = Math.min(...vector)
            const max = Math.max(...vector)
            const range = max - min
            return { min, max, range }
        }
    }, [vector, scalingMode])

    // Normalize value for height mapping (always 0 to 1, with min value at floor)
    const normalizeValue = useCallback((value: number) => {
        const { min, max, range } = scalingParams
        if (range === 0) return 0

        if (scalingMode === 'absolute') {
            // Map [-1,1] to [0,1] with -1 at floor (0) and 1 at peak (1)
            return Math.max(0, Math.min(1, (value + 1) / 2))
        } else {
            // Map [min,max] to [0,1] with min at floor (0) and max at peak (1)
            return (value - min) / range
        }
    }, [scalingParams, scalingMode])

    // Get color based on normalized value and color scheme
    const getColor = useCallback((normalizedValue: number): [number, number, number] => {
        // normalizedValue is already in 0-1 range (floor to peak)
        const colorValue = Math.max(0, Math.min(1, normalizedValue))

        switch (colorScheme) {
            case 'thermal':
                if (colorValue < 0.2) {
                    const s = colorValue / 0.2
                    return [Math.round(s * 64), 0, Math.round(s * 128)]
                } else if (colorValue < 0.4) {
                    const s = (colorValue - 0.2) / 0.2
                    return [Math.round(64 + s * (255 - 64)), 0, Math.round(128 * (1 - s))]
                } else if (colorValue < 0.6) {
                    const s = (colorValue - 0.4) / 0.2
                    return [255, Math.round(s * 165), 0]
                } else if (colorValue < 0.8) {
                    const s = (colorValue - 0.6) / 0.2
                    return [255, Math.round(165 + s * (255 - 165)), 0]
                } else {
                    const s = (colorValue - 0.8) / 0.2
                    return [255, 255, Math.round(s * 255)]
                }

            case 'viridis':
                // Viridis color scheme approximation
                if (colorValue < 0.25) {
                    const t = colorValue / 0.25
                    return [
                        Math.round(68 + t * (59 - 68)),
                        Math.round(1 + t * (82 - 1)),
                        Math.round(84 + t * (139 - 84))
                    ]
                } else if (colorValue < 0.5) {
                    const t = (colorValue - 0.25) / 0.25
                    return [
                        Math.round(59 + t * (33 - 59)),
                        Math.round(82 + t * (144 - 82)),
                        Math.round(139 + t * (140 - 139))
                    ]
                } else if (colorValue < 0.75) {
                    const t = (colorValue - 0.5) / 0.25
                    return [
                        Math.round(33 + t * (94 - 33)),
                        Math.round(144 + t * (201 - 144)),
                        Math.round(140 + t * (98 - 140))
                    ]
                } else {
                    const t = (colorValue - 0.75) / 0.25
                    return [
                        Math.round(94 + t * (253 - 94)),
                        Math.round(201 + t * (231 - 201)),
                        Math.round(98 + t * (37 - 98))
                    ]
                }

            case 'classic':
                // Blue to red gradient
                if (colorValue < 0.5) {
                    const t = colorValue / 0.5
                    return [
                        Math.round(t * 255),
                        Math.round(t * 255),
                        255
                    ]
                } else {
                    const t = (colorValue - 0.5) / 0.5
                    return [
                        255,
                        Math.round(255 * (1 - t)),
                        Math.round(255 * (1 - t))
                    ]
                }

            default:
                return [128, 128, 128]
        }
    }, [colorScheme])

    // Calculate dynamic height scaling for better visualization
    const heightScale = useMemo(() => {
        const { range } = scalingParams

        // Base height scale
        let scale = 2.0

        // For very small ranges, increase the scale dramatically
        if (scalingMode === 'relative') {
            if (range < 0.1) {
                scale = 4.0  // Very small range - make it very dramatic
            } else if (range < 0.5) {
                scale = 3.0  // Small range - make it more dramatic
            } else if (range < 1.0) {
                scale = 2.5  // Medium range - moderate enhancement
            }
        } else {
            // For absolute mode, check if the actual range used is small
            const actualRange = Math.max(...vector) - Math.min(...vector)
            if (actualRange < 0.1) {
                scale = 4.0
            } else if (actualRange < 0.5) {
                scale = 3.0
            } else if (actualRange < 1.0) {
                scale = 2.5
            }
        }

        return scale
    }, [scalingParams, scalingMode, vector])

    // Notify parent of height scale changes
    React.useEffect(() => {
        onHeightScaleChange(heightScale)
    }, [heightScale, onHeightScaleChange])

    // Create geometry and materials
    const { geometry, material } = useMemo(() => {
        const { cols, rows } = gridDimensions

        // Calculate the actual rows needed for the vector data
        const actualRows = Math.ceil(vector.length / cols)
        const usedRows = Math.min(rows, actualRows)

        // Create horizontal plane with only the needed segments
        const geometry = new THREE.PlaneGeometry(4, 4 * (usedRows / rows), cols - 1, usedRows - 1)

        // Rotate the plane to be horizontal (landscape orientation)
        geometry.rotateX(-Math.PI / 2)

        // Get position and color attributes
        const positions = geometry.attributes.position
        const colors = new Float32Array(positions.count * 3)

        // Calculate min value once for padding
        const minValue = Math.min(...vector)
        const minNormalizedHeight = normalizeValue(minValue)
        const minColor = getColor(minNormalizedHeight)

        // Update vertex positions and colors based on vector data
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i)
            const z = positions.getZ(i) // Note: Z is now the "depth" in landscape

            // Map from geometry coordinates to vector indices
            // Adjust for the potentially smaller geometry
            const col = Math.round((x + 2) / 4 * (cols - 1))
            const row = Math.round((z + 2) / (4 * (usedRows / rows)) * (usedRows - 1))
            const vectorIndex = row * cols + col

            if (vectorIndex < vector.length) {
                const value = vector[vectorIndex]
                const normalizedHeight = normalizeValue(value)
                const color = getColor(normalizedHeight)

                // Set height (Y position for horizontal landscape)
                // Use dynamic height scaling to make small differences visible
                positions.setY(i, normalizedHeight * heightScale)

                // Set color
                colors[i * 3] = color[0] / 255
                colors[i * 3 + 1] = color[1] / 255
                colors[i * 3 + 2] = color[2] / 255
            } else {
                // For any remaining padding vertices, use the minimum value's height and color
                // This ensures visual continuity without cliffs
                positions.setY(i, minNormalizedHeight * heightScale)
                colors[i * 3] = minColor[0] / 255
                colors[i * 3 + 1] = minColor[1] / 255
                colors[i * 3 + 2] = minColor[2] / 255
            }
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geometry.computeVertexNormals()

        const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            wireframe: false
        })

        return { geometry, material }
    }, [vector, gridDimensions, normalizeValue, getColor, heightScale])

    // Handle mouse interactions for hover
    const handlePointerMove = useCallback((event: any) => {
        if (!showStats || !meshRef.current) return

        event.stopPropagation()
        
        // Update raycaster
        raycaster.setFromCamera(pointer, camera)
        const intersects = raycaster.intersectObject(meshRef.current)

        if (intersects.length > 0) {
            const intersection = intersects[0]
            const { point, face } = intersection
            
            if (face) {
                // Get the closest vertex to determine which vector dimension this represents
                const { cols, rows } = gridDimensions
                const x = point.x
                const z = point.z // Now using Z for the "depth" in horizontal landscape

                // Calculate the actual rows used for the geometry
                const actualRows = Math.ceil(vector.length / cols)
                const usedRows = Math.min(rows, actualRows)

                const col = Math.round((x + 2) / 4 * (cols - 1))
                const row = Math.round((z + 2) / (4 * (usedRows / rows)) * (usedRows - 1))
                const vectorIndex = row * cols + col

                if (vectorIndex < vector.length) {
                    // Convert 3D position to screen coordinates
                    const screenPosition = point.clone().project(camera)
                    const canvas = gl.domElement
                    const rect = canvas.getBoundingClientRect()
                    const screenX = (screenPosition.x * 0.5 + 0.5) * rect.width + rect.left
                    const screenY = (-screenPosition.y * 0.5 + 0.5) * rect.height + rect.top

                    onHover({
                        dimension: vectorIndex,
                        value: vector[vectorIndex],
                        position: [point.x, point.y, point.z],
                        screenPosition: [screenX, screenY]
                    })
                    return
                }
            }
        }
        
        onHover(null)
    }, [showStats, camera, raycaster, pointer, gl, vector, gridDimensions, onHover])

    const handlePointerLeave = useCallback(() => {
        onHover(null)
    }, [onHover])

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        />
    )
}

// Main component
export default function Vector3DSurfaceRenderer({
    vector,
    className = "",
    size = 300,
    showStats = false,
    scalingMode = 'relative',
    colorScheme = 'thermal',
    noPadding = false
}: Vector3DSurfaceRendererProps) {
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
    const [currentHeightScale, setCurrentHeightScale] = useState<number>(2.0)
    const isMiniMode = size < 150 // Disable hover for mini displays

    // Don't render if no vector data
    if (!vector || vector.length === 0) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-100 ${className}`}
                style={{ width: size, height: size }}
            >
                <span className="text-gray-500 text-sm">No data</span>
            </div>
        )
    }

    // Validate vector data
    if (!Array.isArray(vector) || vector.some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v))) {
        return (
            <div
                className={`flex items-center justify-center bg-red-100 ${className}`}
                style={{ width: size, height: size }}
            >
                <span className="text-red-500 text-sm">Invalid data</span>
            </div>
        )
    }

    const handleHover = useCallback((info: HoverInfo | null) => {
        if (!isMiniMode) {
            setHoverInfo(info)
        }
    }, [isMiniMode])

    const handleHeightScaleChange = useCallback((scale: number) => {
        setCurrentHeightScale(scale)
    }, [])

    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            <Canvas
                camera={{
                    position: [4, 3, 4],
                    fov: 50,
                    near: 0.1,
                    far: 100
                }}
                style={{ width: size, height: size }}
            >
                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[5, 8, 5]}
                    intensity={0.8}
                    castShadow
                />
                <directionalLight
                    position={[-3, 2, -3]}
                    intensity={0.4}
                />

                {/* Surface mesh */}
                <SurfaceMesh
                    vector={vector}
                    scalingMode={scalingMode}
                    colorScheme={colorScheme}
                    showStats={showStats && !isMiniMode}
                    onHover={handleHover}
                    onHeightScaleChange={handleHeightScaleChange}
                />

                {/* Grid helper for reference (horizontal grid at floor level) */}
                <gridHelper
                    args={[6, 10]}
                    position={[0, -0.05, 0]}
                    material-color="#888888"
                    material-opacity={0.2}
                    material-transparent={true}
                />

                {/* Controls */}
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={4}
                    maxDistance={15}
                    maxPolarAngle={Math.PI * 0.45}
                    minPolarAngle={Math.PI * 0.05}
                    target={[0, currentHeightScale * 0.3, 0]}
                />
            </Canvas>

            {/* Hover tooltip */}
            {!isMiniMode && hoverInfo && (
                <div
                    className="fixed bg-black text-white text-xs p-2 rounded shadow-lg pointer-events-none z-50"
                    style={{
                        left: hoverInfo.screenPosition[0] + 10,
                        top: hoverInfo.screenPosition[1] - 30
                    }}
                >
                    <div>Dim {hoverInfo.dimension}: {hoverInfo.value.toFixed(4)}</div>
                    <div className="text-gray-300">
                        Height: {((hoverInfo.value - (scalingMode === 'absolute' ? -1 : Math.min(...vector))) /
                                 (scalingMode === 'absolute' ? 2 : Math.max(...vector) - Math.min(...vector))).toFixed(3)}
                    </div>
                </div>
            )}

            {/* Legend for color mapping */}
            {!isMiniMode && (
                <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 p-2 rounded text-xs">
                    <div className="font-medium mb-1">Landscape Height</div>
                    <div className="flex items-center space-x-1">
                        <span className="text-blue-600">Floor</span>
                        <div className="w-8 h-2 bg-gradient-to-r from-blue-500 to-red-500"></div>
                        <span className="text-red-600">Peaks</span>
                    </div>
                    <div className="text-gray-600 mt-1">
                        {scalingMode === 'absolute' ? 'Min: -1, Max: 1' : 'Min → Max'}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                        Height: {currentHeightScale.toFixed(1)}x enhanced
                    </div>
                </div>
            )}
        </div>
    )
}
