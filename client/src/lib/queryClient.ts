import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Overloaded function to support both old and new calling patterns
export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
  data?: unknown
): Promise<any> {
  let url: string;
  let method: string;
  let body: unknown;
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Handle old calling pattern: apiRequest(method, url, data)
  if (typeof urlOrOptions === 'string') {
    method = urlOrMethod;
    url = urlOrOptions;
    body = data;
  } 
  // Handle new calling pattern: apiRequest(url, options)
  else {
    url = urlOrMethod;
    const options = urlOrOptions || {};
    method = options.method || 'GET';
    body = options.body;
    headers = { ...headers, ...options.headers };
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // Include session cookies
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Simple query function for dev mode
const devQueryFn: QueryFunction = async ({ queryKey }) => {
  console.log('Query function called for:', queryKey[0]);
  try {
    const res = await fetch(queryKey[0] as string, { 
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Response received:', Array.isArray(data) ? `${data.length} items` : 'object');
    return data;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

export const getQueryFn = (options: {
  on401: UnauthorizedBehavior;
}) => devQueryFn;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
