// API base URL
const API_URL = "http://localhost:3000"

/**
 * Makes a POST request to the API
 * @param endpoint - API endpoint
 * @param data - Request body data
 * @returns Promise with response data
 */
export async function postRequest<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const responseData = await response.json()

  if (!response.ok) {
    throw new Error(responseData.message || "An error occurred")
  }

  return responseData
}

/**
 * Makes a GET request to the API
 * @param endpoint - API endpoint
 * @param token - Optional auth token
 * @returns Promise with response data
 */
export async function getRequest<T>(endpoint: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "An error occurred")
  }

  return data
}
