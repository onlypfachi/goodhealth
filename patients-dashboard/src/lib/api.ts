// API Service for Patient Dashboard
// Connects to the backend server

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  error?: string;
}

interface User {
  id: string;
  email: string;
  patientId: string;
  userType: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AppointmentResponse {
  success: boolean;
  message?: string;
  appointments: Appointment[];
}

interface Appointment {
  id?: number;
  patient: {
    id?: number;
    name?: string;
    email?: string;
    patientId?: string;
  };
  doctor?: {
    id?: number;
    name?: string;
    email?: string;
    staffId?: string;
    department: {
      id?: number;
      name?: string;
      description?: string;
    };
  };
  date: string;
  time: string;
  appointmentDate?: string;
  appointmentTime?: string;
  queueNumber?: number;
  reasons: string;
  status: string;
  createdAt?: string;
}

// Helper function to get auth token
const getToken = (): string | null => {
  return localStorage.getItem("token");
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    "Content-Type": "application/json",
  };
};

// Patient Authentication
export const patientAuth = {
  // Sign up new patient
  signup: async (
    name: string,
    email: string,
    password: string,
    password_confirmation: string
  ): Promise<ApiResponse<AuthResponse>> => {
    const body = new URLSearchParams();
    body.append("name", name);
    body.append("email", email);
    body.append("password", password);
    body.append("password_confirmation", password_confirmation);

    const response = await fetch(`${API_BASE_URL}/api/auth/patient/signup`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();
    if (data.success && data.token && data.user) {
      // Store token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Login patient
  login: async (
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/patient/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success && data.token && data.user) {
      // Store token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!getToken();
  },

  // Verify token
  verify: async (): Promise<ApiResponse<any>> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/patient/verify`, {
      headers: getAuthHeaders(),
    });

    return await response.json();
  },
};

// Appointments API
export const appointments = {
  // Book new appointment
  book: async (appointmentData: {
    department: string;
    reason: string;
    appointment_date?: string;
    doctor_id?: string;
    date?: string;
    time?: string;
  }): Promise<ApiResponse<Appointment>> => {
    const user = patientAuth.getCurrentUser();

    if (!user) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    // Generate next available appointment date/time if not provided
    const nextTuesday = new Date();
    nextTuesday.setDate(
      nextTuesday.getDate() + ((2 + 7 - nextTuesday.getDay()) % 7 || 7)
    );

    // Prepare the request body with proper field names
    const requestBody = {
      department: appointmentData.department, // Can be department ID or name
      reason: appointmentData.reason,
      appointment_date:
        appointmentData.appointment_date ||
        appointmentData.date ||
        nextTuesday.toISOString().split("T")[0],
      appointment_time: appointmentData.time || null,
      doctor_id: appointmentData.doctor_id
        ? parseInt(appointmentData.doctor_id)
        : null,
    };

    console.log("📤 Booking appointment with data:", requestBody);

    const response = await fetch(`${API_BASE_URL}/api/appointments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("📥 Booking response:", result);

    return result;
  },

  // Get patient appointments
  getPatientAppointments: async (
    patientId: string
  ): Promise<AppointmentResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/appointments`, {
      headers: getAuthHeaders(),
    });

    return await response.json();
  },

  // Cancel appointment
  cancel: async (appointmentId: string): Promise<ApiResponse<any>> => {
    const response = await fetch(
      `${API_BASE_URL}/api/appointments/${appointmentId}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    return await response.json();
  },
};

// Health check
export const healthCheck = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: "Cannot connect to server",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Generic API methods
export const api = {
  get: async (endpoint: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  post: async (endpoint: string, data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  },

  put: async (endpoint: string, data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  },

  patch: async (endpoint: string, data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  },

  delete: async (endpoint: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await response.json();
  },
};

export default {
  patientAuth,
  appointments,
  healthCheck,
  api,
};
