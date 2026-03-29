/**
 * Safe fetch wrapper — catches network errors and returns fallback data
 */
export async function safeFetch<T>(
  fetcher: () => Promise<{ data: T }>,
  fallback: T,
): Promise<{ data: T; error: string | null }> {
  try {
    const result = await fetcher();
    return { data: result.data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API Error]", message);
    return { data: fallback, error: message };
  }
}
