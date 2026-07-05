export interface ApiClientOptions {
  baseUrl?: string;
  token?: string;
  timeout?: number;
  retries?: number;
  headers?: HeadersInit;
}

export interface ApiErrorResponse {
  message: string;
  status: number;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(
    message: string,
    status: number,
    details?: unknown
  ) {

    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestInterceptor = (
  config: RequestInit
) => Promise<RequestInit> | RequestInit;

type ResponseInterceptor = (
  response: Response
) => Promise<Response> | Response;

export class ApiClient {

  private baseUrl: string;
  private token?: string;
  private timeout: number;
  private retries: number;
  private headers: HeadersInit;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.token = options.token;
    this.timeout = options.timeout ?? 15000;
    this.retries = options.retries ?? 3;
    this.headers = options.headers ?? {};
  }

  setToken(token?: string) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  addRequestInterceptor(
    interceptor: RequestInterceptor
  ) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: ResponseInterceptor
  ) {
    this.responseInterceptors.push(interceptor);
  }

  get<T>(url: string) {

    return this.request<T>(url, {
      method: "GET"
    });
  }

  post<T>(url: string, body?: unknown) {

    return this.request<T>(url, {
      method: "POST",
      body: body
        ? JSON.stringify(body)
        : undefined
    });
  }

  put<T>(url: string, body?: unknown) {

    return this.request<T>(url, {
      method: "PUT",
      body: body
        ? JSON.stringify(body)
        : undefined
    });
  }

  patch<T>(url: string, body?: unknown) {

    return this.request<T>(url, {
      method: "PATCH",
      body: body
        ? JSON.stringify(body)
        : undefined
    });
  }

  delete<T>(url: string) {

    return this.request<T>(url, {
      method: "DELETE"
    });
  }

  async request<T>(
    endpoint: string,
    config: RequestInit = {}
  ): Promise<T> {

    let lastError: unknown;

    for (
      let attempt = 0;
      attempt <= this.retries;
      attempt++
    ) {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, this.timeout);
      try {
        let requestConfig: RequestInit = {
          ...config,
          signal: controller.signal,
          headers: {
            "Content-Type":
              "application/json",
            ...this.headers,
            ...(this.token && {
              Authorization:
                `Bearer ${this.token}`
            }),
            ...(config.headers ?? {})
          }
        };

        for (const interceptor of this.requestInterceptors) {
          requestConfig =
            await interceptor(requestConfig);
        }

        let response = await fetch(
          `${this.baseUrl}${endpoint}`,
          requestConfig
        );

        for (const interceptor of this.responseInterceptors) {
          response =
            await interceptor(response);
        }

        clearTimeout(timeout);
        if (!response.ok) {
          let payload: unknown;
          try {
            payload =
              await response.json();
          } catch {
            payload =
              await response.text();
          }

          throw new ApiError(
            typeof payload === "object" &&
            payload &&
            "message" in payload
              ? String(payload.message)
              : response.statusText,
            response.status,
            payload
          );
        }

        const contentType =
          response.headers.get("content-type");

        if (
          contentType?.includes("application/json")
        ) {
          return await response.json();
        }

        return await response.text() as T;
      }

      catch (error) {
        clearTimeout(timeout);
        lastError = error;
        if (attempt >= this.retries) {
          break;
        }

        const delay =
          Math.pow(2, attempt) * 500 +
          Math.random() * 300;
        await new Promise(resolve =>
          setTimeout(resolve, delay)
        );
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error("Unknown API error");
  }
}

export const apiClient = new ApiClient();