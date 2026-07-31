const LEGACY_CACHE_PREFIXES = ['portfolio-', 'kar1m0vf-portfolio'];

export async function cleanupLegacyRuntime(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    const legacyCaches = cacheNames.filter((name) =>
      LEGACY_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)),
    );
    await Promise.all(legacyCaches.map((name) => caches.delete(name)));
  }
}
