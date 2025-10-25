import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import "./StaffLogin.css";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    staffId: "",
    password: ""
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validateStaffId = (staffId: string) => {
    // Staff ID must be in format EMP1234 (EMP followed by 4 digits)
    const staffIdRegex = /^EMP\d{4}$/;
    return staffIdRegex.test(staffId);
  };

  const clearErrors = () => {
    setErrors({
      email: "",
      staffId: "",
      password: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    let newErrors = {
      email: "",
      staffId: "",
      password: ""
    };
    let isValid = true;

    // Validate email
    if (!email.trim()) {
      newErrors.email = "Enter email";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Email must be in format: name@gmail.com";
      isValid = false;
    }

    // Validate staff ID
    if (!staffId.trim()) {
      newErrors.staffId = "Enter staff ID";
      isValid = false;
    } else if (!validateStaffId(staffId)) {
      newErrors.staffId = "Wrong staff ID";
      isValid = false;
    }

    // Validate password
    if (!password.trim()) {
      newErrors.password = "Enter password";
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      // Call staff login API
      const response = await fetch('http://localhost:5000/api/auth/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, staffId, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.success) {
        // Store staff token (data is nested in data.data)
        localStorage.setItem('staffToken', data.data.token);
        localStorage.setItem('staffUser', JSON.stringify(data.data.user));

        toast.success("Login successful! Welcome back.");

        // Redirect based on role
        if (data.data.user.role === 'admin' || data.data.user.role === 'superadmin') {
          window.location.href = '/admin-dashboard'; // Navigate to admin dashboard
        } else {
          navigate("/doctor-dashboard");
        }
      } else {
        toast.error(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      toast.error("Cannot connect to server. Please make sure the server is running.");
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="staff-login-page-container">
      <div className="staff-login-body-section">
        <div className="staff-login-content">
          {/* Logo/Title */}
          <div className="staff-login-logo-section">
            <h1 className="staff-login-title">
              Welcome To <span className="staff-login-title-good">GOOD</span>HEALTH
            </h1>
            <p className="staff-login-subtitle">Online Booking Staff Portal</p>
          </div>

          {/* Form Container */}
          <div className="staff-login-form-container">
            <form onSubmit={handleSubmit} className="staff-login-form">
              <div className="staff-login-input-wrapper">
                <input
                  type="email"
                  placeholder="Email Address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`staff-login-input ${errors.email ? "staff-login-input-error" : ""}`}
                  disabled={isLoading}
                />
                {errors.email && <span className="staff-login-error-text">{errors.email}</span>}
              </div>

              <div className="staff-login-input-wrapper">
                <input
                  type="text"
                  placeholder="Staff ID..."
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className={`staff-login-input ${errors.staffId ? "staff-login-input-error" : ""}`}
                  disabled={isLoading}
                />
                {errors.staffId && <span className="staff-login-error-text">{errors.staffId}</span>}
              </div>

              <div className="staff-login-input-wrapper staff-login-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`staff-login-input ${errors.password ? "staff-login-input-error" : ""}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="staff-login-toggle-password"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {errors.password && <span className="staff-login-error-text">{errors.password}</span>}
              </div>

              <button
                type="submit"
                className="staff-login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                    Logging In...
                  </>
                ) : (
                  "Get Started"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="staff-login-footer">
            <p className="staff-login-footer-text">Your health is our priority</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
