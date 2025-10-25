// API Configuration
// Uses Vite environment variable VITE_API_BASE_URL when available (set in .env),
// otherwise falls back to the local development backend.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Helper function to make authenticated requests
export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    },
    credentials: 'include'
  });

  return response.json();
};
