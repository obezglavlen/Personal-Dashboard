/**
 * Browser-side API client. Thin wrappers over `fetch` that send/parse JSON and
 * turn non-2xx responses into a thrown {@link ApiClientError} carrying the
 * server's error message. Pairs with the server-side `lib/api` layer.
 */

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  const body = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const err = (body as { error?: unknown } | null)?.error;
    const message = typeof err === "string" ? err : `Request failed (${res.status})`;
    throw new ApiClientError(res.status, message, err);
  }

  return body as T;
}

function send<T>(method: string, url: string, data?: unknown): Promise<T> {
  return fetch(url, {
    method,
    ...(data !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  }).then((res) => parse<T>(res));
}

/** SWR fetcher: GET + JSON, throwing on error so SWR surfaces it. */
export const fetcher = <T>(url: string): Promise<T> => send<T>("GET", url);

export const apiGet = <T>(url: string): Promise<T> => send<T>("GET", url);
export const apiPost = <T>(url: string, data: unknown): Promise<T> => send<T>("POST", url, data);
export const apiPut = <T>(url: string, data: unknown): Promise<T> => send<T>("PUT", url, data);
export const apiPatch = <T>(url: string, data: unknown): Promise<T> => send<T>("PATCH", url, data);
export const apiDelete = <T>(url: string): Promise<T> => send<T>("DELETE", url);
