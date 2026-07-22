import { RedisConnection, getRedisUrl } from '@/services/redis-server/RedisConnection'
import { validateRequest, formatResponse, handleError } from '@/services/redis-server/utils'
import { validateVremRequest, buildVremCommand } from './command'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // Validate request
        const validatedRequest = await validateRequest(request, validateVremRequest)
        
        // Get Redis URL
        const redisUrl = await getRedisUrl()
        if (!redisUrl) {
            return NextResponse.json(
                { success: false, error: 'No Redis connection available' },
                { status: 401 }
            )
        }

        const commands = buildVremCommand(validatedRequest)
        const commandStr = commands
            .map((cmd) => cmd.join(" "))
            .join(" ")

        // If returnCommandOnly is true, return just the command
        if (validatedRequest.returnCommandOnly) {
            return NextResponse.json({
                success: true,
                executedCommand: commands[0]
            })
        }

        // Execute command
        const redisResult = await RedisConnection.withClient(redisUrl, async (client) => {
            if (validatedRequest.elements) {
                // For multi-element removal, execute each command in a transaction
                // Build command

                const multi = client.multi()
                for (const command of commands) {
                    multi.addCommand(command)
                }
                const result = await multi.exec()

                // TODO: Clean up thumbnails for successfully removed elements
                // Temporarily disabled to debug the main issue
                /*
                if (result && Array.isArray(result)) {
                    try {
                        const elementsToCleanup = validatedRequest.elements!.filter((_, index) => result[index] === 1)
                        if (elementsToCleanup.length > 0) {
                            const hashKey = `${validatedRequest.keyName}:thumbnails`
                            // Use individual hDel calls to avoid potential issues with array parameter
                            for (const element of elementsToCleanup) {
                                try {
                                    await client.hDel(hashKey, element)
                                } catch (individualError) {
                                    console.warn(`Failed to clean up thumbnail for element ${element}:`, individualError)
                                }
                            }
                        }
                    } catch (thumbnailError) {
                        console.error('Failed to clean up thumbnails after VREM:', thumbnailError)
                    }
                }
                */

                return result
            } else {
                // Single element removal
                const result = await client.sendCommand(commands[0])

                // TODO: Clean up thumbnail for successfully removed element
                // Temporarily disabled to debug the main issue
                /*
                if (result === 1 && validatedRequest.element) {
                    try {
                        const hashKey = `${validatedRequest.keyName}:thumbnails`
                        await client.hDel(hashKey, validatedRequest.element)
                    } catch (thumbnailError) {
                        console.warn(`Failed to clean up thumbnail for element ${validatedRequest.element}:`, thumbnailError)
                        // Don't let thumbnail cleanup failure affect the main operation
                    }
                }
                */

                return result
            }
        })

        // Check if the Redis operation itself failed
        if (!redisResult.success) {
            return formatResponse(redisResult)
        }

        if (validatedRequest.elements) {
            // For multi-element removal, we get an array of results from EXEC
            // Each result is 1 for success or 0 for failure
            const results = redisResult.result as unknown as number[]
            const successCount = results.reduce((sum, result) => sum + (result === 1 ? 1 : 0), 0)
            
            return formatResponse({
                success: successCount > 0, // Consider partial success as success
                result: {
                    totalElements: validatedRequest.elements.length,
                    successfulRemovals: successCount,
                    results: results.map((result, index) => ({
                        element: validatedRequest.elements![index],
                        removed: result === 1
                    }))
                },
                executedCommand: commandStr,
                error: successCount === 0 ? 'No elements were removed' : undefined
            })
        } else {
            // Single element removal
            const success = Number(redisResult.result) === 1
            return formatResponse({
                success,
                result: redisResult.result,
                executedCommand: commandStr,
                error: !success ? 'Element does not exist' : undefined
            })
        }
    } catch (error) {
        return handleError(error)
    }
}
