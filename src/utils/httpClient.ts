
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
    return httpClient.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  },
  

  /**
   * Sends a DELETE request
   */
  delete: async (url: string, data?: any, options: RequestOptions = {}) => {
    return httpClient.post(url, data, { ...options, method: 'DELETE' });
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
    
    // Send the request
    const response = await fetch(url, fetchOptions);
    
    // Handle common response processing
    if (!response.ok) {
      // Handle error responses
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Request failed');
      } catch (error) {
        throw new Error(`Request failed with status: ${response.status}`);
      }
    }
    
    // For successful responses, try to parse JSON or return response based on content type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response;
  }
};

export default httpClient;
