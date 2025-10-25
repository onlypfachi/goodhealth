import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { patientAuth } from "@/lib/api";
import "./LoginNew.css";

const LoginNew = () => {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    rePassword: ""
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const clearErrors = () => {
    setErrors({
      name: "",
      email: "",
      password: "",
      rePassword: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const newErrors = {
      name: "",
      email: "",
      password: "",
      rePassword: ""
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

    // Validate password
    if (!password.trim()) {
      newErrors.password = "Enter password";
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Validate re-enter password (only in signup mode)
    if (isSignup) {
      if (!rePassword.trim()) {
        newErrors.rePassword = "Re-enter password";
        isValid = false;
      } else if (password !== rePassword) {
        newErrors.rePassword = "Passwords do not match";
        isValid = false;
      }
    }

    setErrors(newErrors);

    if (!isValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignup) {
        const response = await patientAuth.signup(name, email, password, rePassword);
        
        if (response.success) {
          toast.success("Account created successfully! Welcome to Good Health Hospital.");
          navigate("/dashboard");
        } else {
          if (response.errors && response.errors.length > 0) {
            response.errors.forEach((error: any) => {
              toast.error(error.msg || error.message);
            });
          } else {
            toast.error(response.message || "Signup failed. Please try again.");
          }
        }
      } else {
        const response = await patientAuth.login(email, password);
        if (response.success) {
          toast.success("Login successful! Welcome back.");
          navigate("/dashboard");
        } else {
          toast.error(response.message || "Login failed. Please check your credentials.");
        }
      }
    } catch (error) {
      toast.error("Cannot connect to server. Please make sure the server is running.");
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (signup: boolean) => {
    setIsSignup(signup);
    clearErrors();
  };

  return (
    <div className="login-page-container">
      <div className="login-body-section">
        <div className="login-content">
          {/* Logo/Title */}
          <div className="login-logo-section">
            <h1 className="login-title">
              Welcome To <span className="login-title-good">GOOD</span>HEALTH
            </h1>
            <p className="login-subtitle">Online Booking Portal</p>
          </div>

          {/* Form Container */}
          <div className="login-form-container">
            <form onSubmit={handleSubmit} className="login-form">
              { isSignup &&
                <div className="login-input-wrapper">
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`login-input ${errors.name ? "login-input-error" : ""}`}
                  disabled={isLoading}
                />
                {errors.email && <span className="login-error-text">{errors.email}</span>}
              </div>}
              <div className="login-input-wrapper">
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`login-input ${errors.email ? "login-input-error" : ""}`}
                  disabled={isLoading}
                />
                {errors.email && <span className="login-error-text">{errors.email}</span>}
              </div>

              <div className="login-input-wrapper login-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`login-input ${errors.password ? "login-input-error" : ""}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-toggle-password"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {errors.password && <span className="login-error-text">{errors.password}</span>}
              </div>

              {isSignup && (
                <div className="login-input-wrapper login-password-wrapper">
                  <input
                    type={showRePassword ? "text" : "password"}
                    placeholder="Confirm Password..."
                    value={rePassword}
                    onChange={(e) => setRePassword(e.target.value)}
                    className={`login-input ${errors.rePassword ? "login-input-error" : ""}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRePassword(!showRePassword)}
                    className="login-toggle-password"
                    disabled={isLoading}
                  >
                    {showRePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {errors.rePassword && <span className="login-error-text">{errors.rePassword}</span>}
                </div>
              )}

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                    {isSignup ? "Creating Account..." : "Logging In..."}
                  </>
                ) : (
                  "Get Started"
                )}
              </button>

              <div className="login-mode-switch">
                <button
                  type="button"
                  onClick={() => switchMode(!isSignup)}
                  className="login-switch-btn"
                  disabled={isLoading}
                >
                  {isSignup ? "Already have an account? Log In" : "Need an account? Sign Up"}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p className="login-footer-text">Your health is our priority</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LoginNew;
