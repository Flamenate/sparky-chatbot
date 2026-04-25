/**
 * In-memory registry of active AI generation AbortControllers, keyed by
 * a stable identifier (e.g. `platform:userId`).
 *
 * Call `abortIfRunning` before starting a new generation to cancel
 * any in-flight generation for the same key, then `register` the new
 * controller. Call `unregister` once the generation settles.
 */

const controllers = new Map<string, AbortController>();

/** Build a consistent key from platform + userId. */
export function generationKey(platform: string, userId: string): string {
  return `${platform}:${userId}`;
}

/**
 * If a generation is already running for `key`, abort it and remove it
 * from the registry.  Returns `true` if an existing generation was aborted.
 */
export function abortIfRunning(key: string): boolean {
  const existing = controllers.get(key);
  if (existing) {
    existing.abort();
    controllers.delete(key);
    return true;
  }
  return false;
}

/** Register a new AbortController for `key`. */
export function register(key: string, controller: AbortController): void {
  controllers.set(key, controller);
}

/** Remove the controller for `key` (call after generation settles). */
export function unregister(key: string): void {
  controllers.delete(key);
}
