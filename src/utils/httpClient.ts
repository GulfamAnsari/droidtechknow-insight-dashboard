
import Cookies from "js-cookie";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * HTTP client with interceptor functionality to automatically add authentication headers
 */
const httpClient = {
  /**
   * Sends a GET request
   */
  get: async (url: string, options: RequestOptions = {}) => {
    return httpClient.request(url, { ...options, method: 'GET' });
  },

  /**
   * Sends a POST request
   */
  post: async (url: string, data?: any, options: RequestOptions = {}) => {
    let headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
    let body: string | FormData = data;
  
    const isFormData = data instanceof FormData;
  
    if (!isFormData) {
      body = JSON.stringify(data);
    }
  
    return httpClient.request(url, {
      ...options,
      method: 'POST',
      body,
      headers,
    });
  },

  /**
   * Sends a PUT request
   */
  put: async (url: string, data?: any, options: RequestOptions = {}) => {
    let headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
    let body: string | FormData = data;
  
    const isFormData = data instanceof FormData;
  
    if (!isFormData) {
      body = JSON.stringify(data);
    }
  
    return httpClient.request(url, {
      ...options,
      method: 'PUT',
      body,
      headers,
    });
  },

  /**
   * Sends a DELETE request
   */
  delete: async (url: string, data?: any, options: RequestOptions = {}) => {
    let headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
    return httpClient.request(url, {
      ...options,
      method: 'DELETE',
      body: JSON.stringify(data),
      headers,
    });
  },

  /**
   * Base request method with interceptor functionality
   */
  request: async (url: string, options: RequestOptions = {}) => {
    const { skipAuth = false, ...fetchOptions } = options;
    
    // Apply authentication interceptor unless skipAuth is true
    if (!skipAuth) {
      const headers = new Headers(fetchOptions.headers);
      
      // Add auth token from cookie if it exists
      const authToken = Cookies.get('Cookie');
      if (authToken) {
        headers.set('X-Auth-Token', authToken);
      }
      
      // Add userId from cookie if it exists
      const userId = Cookies.get('userId');
      if (userId) {
        headers.set('Id', userId);
      }
      
      fetchOptions.headers = headers;
    }
    
    // Disable cache for all requests
    //fetchOptions.cache = 'no-store';
     //fetchOptions.headers = new Headers(fetchOptions.headers);
     //fetchOptions.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
     //fetchOptions.headers.set('Pragma', 'no-cache');
   //fetchOptions.headers.set('Expires', '0');
   function noCache(url) {
    const apiUrl = new URL(url, window.location.origin);
    apiUrl.searchParams.set('nocache', Date.now().toString());
    return apiUrl.toString();
  }

    // Fetch with timeout + retry for flaky / slow connections (e.g. tablets on mobile data)
    const attemptFetch = async (): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        return await fetch(noCache(url), {
          ...fetchOptions,
          cache: 'no-store', // <-- explicitly disable HTTP cache
          signal: fetchOptions.signal ?? controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    };

    let response: Response;
    try {
      response = await attemptFetch();
    } catch (err: any) {
      if (err?.name === 'AbortError' && !fetchOptions.signal) {
        throw new Error('The server took too long to respond. Please check your connection and try again.');
      }
      // One silent retry for transient network failures
      try {
        response = await attemptFetch();
      } catch (err2: any) {
        if (err2?.name === 'AbortError') {
          throw new Error('The server took too long to respond. Please check your connection and try again.');
        }
        throw new Error(
          navigator.onLine
            ? 'Could not reach the server. Please try again.'
            : 'You appear to be offline. Please check your internet connection.'
        );
      }
    }

    // Read the body once as text, then try to parse it as JSON regardless of content-type
    // (the auth API sometimes replies with text/html or text/plain)
    const rawText = await response.text();
    let parsed: any = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Some PHP endpoints prefix output (warnings) before the JSON payload
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end > start) {
          try {
            parsed = JSON.parse(rawText.slice(start, end + 1));
          } catch {
            parsed = null;
          }
        }
      }
    }

    if (!response.ok) {
      const apiMessage =
        parsed?.message ||
        parsed?.error ||
        (rawText && rawText.length < 300 ? rawText.trim() : '') ||
        `Request failed with status: ${response.status}`;
      throw new Error(apiMessage);
    }

    if (parsed !== null) {
      return parsed;
    }

    return rawText;
  }
};

export default httpClient;
