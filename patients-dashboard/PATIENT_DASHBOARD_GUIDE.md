# Patient Dashboard - Setup & Usage Guide

A modern, responsive patient dashboard for booking appointments and managing healthcare at Good Health Hospital.

## ✨ Features

✅ **Authentication**
- Patient signup with email and patient ID
- Secure login system
- JWT token-based authentication
- Automatic redirect to dashboard when logged in

✅ **Appointment Booking**
- Select from 9+ medical departments
- Optional doctor selection
- Describe symptoms
- Real-time queue number assignment
- Appointment confirmation

✅ **Dashboard**
- Home tab with booking form
- Queue status tracking
- Notification preferences
- Medical reports (coming soon)
- Profile settings

✅ **Modern UI**
- Built with React + TypeScript
- Shadcn/UI components
- Responsive design (mobile-first)
- Smooth animations
- Toast notifications

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# The .env file is already created with:
VITE_API_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```

The app will run on `http://localhost:5173` (or next available port).

## 📋 Usage Guide

### First Time Setup

1. **Start the Backend Server First!**
   ```bash
   cd "../server"
   npm install
   npm run dev
   ```
   Server runs on `http://localhost:5000`

2. **Start the Patient Dashboard**
   ```bash
   npm run dev
   ```
   Dashboard runs on `http://localhost:5173`

3. **Create Account**
   - Visit `http://localhost:5173`
   - Click "Get Started" or "Sign Up"
   - Enter email (must be @gmail.com)
   - Create a patient ID (e.g., PAT001)
   - Set password (min 6 characters)
   - Click "Create Account"

4. **Book Appointment**
   - Select a medical department
   - Describe your symptoms (min 10 characters)
   - Optionally choose a specific doctor
   - Click "Book Appointment"
   - View your queue number and appointment details

### Returning Users

1. Visit `http://localhost:5173`
2. Click "Login"
3. Enter your email and password
4. You'll be redirected to the dashboard automatically

### Logging Out

- Click the logout icon (↗️) in the top-right corner of the dashboard

## 🏗️ Project Structure

```
src/
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   │   ├── BookingForm.tsx         # Appointment booking form
│   │   ├── DashboardHeader.tsx     # Top navigation with logout
│   │   ├── DepartmentSelector.tsx  # Department picker
│   │   ├── DoctorDropdown.tsx      # Doctor selection
│   │   ├── QueueStatus.tsx         # Queue info display
│   │   ├── ProfileSettings.tsx     # User profile
│   │   └── ...
│   └── ui/                 # Reusable UI components (shadcn)
│
├── lib/
│   ├── api.ts             # Backend API integration
│   └── utils.ts           # Utility functions
│
├── pages/
│   ├── Index.tsx          # Landing page
│   ├── Login.tsx          # Login page
│   ├── Signup.tsx         # Signup page
│   ├── Dashboard.tsx      # Main dashboard
│   └── NotFound.tsx       # 404 page
│
├── App.tsx                # App routing and protected routes
└── main.tsx               # App entry point
```

## 🔌 API Integration

The dashboard connects to the backend server via `src/lib/api.ts`.

### Available API Methods

```typescript
import { patientAuth, appointments } from '@/lib/api';

// Authentication
await patientAuth.signup(email, patientId, password);
await patientAuth.login(email, password);
patientAuth.logout();
const user = patientAuth.getCurrentUser();
const isLoggedIn = patientAuth.isAuthenticated();

// Appointments
const response = await appointments.book({
  department: 'general-practice',
  symptoms: 'Fever and headache',
  doctorId: 'optional-doctor-id'
});
```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend server URL | `http://localhost:5000` |

**Note**: Restart the dev server after changing environment variables.

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

## 🐛 Troubleshooting

### Cannot connect to server
**Error**: "Cannot connect to server. Please make sure the server is running."

**Solution**:
1. Check if backend server is running on `http://localhost:5000`
2. Visit `http://localhost:5000/health` - should return `{"success":true,...}`
3. Verify `VITE_API_URL` in `.env` matches server URL
4. Restart both server and client after changes

### Login/Signup not working
**Error**: Validation errors or "Invalid credentials"

**Solution**:
- **Email**: Must be a valid Gmail address (e.g., `user@gmail.com`)
- **Patient ID**: Required, can be any string (e.g., `PAT001`)
- **Password**: Minimum 6 characters
- Check browser console for detailed error messages

### Already logged in, can't access login page
**Behavior**: Redirects to dashboard automatically

**Explanation**: This is intentional! If you're logged in, you can't access login/signup pages.

**Solution**: Click the logout button in dashboard header first.

### Port 5173 already in use
**Solution**: Vite will automatically use next available port (5174, 5175, etc.). Check terminal for actual port.

### CORS errors
**Error**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution**:
1. Ensure backend server is running
2. Check server `.env` has correct CORS_ORIGIN including your client URL
3. Restart backend server

## 💻 Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **React Router** - Client-side routing
- **Shadcn/UI** - Beautiful component library
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Server state management
- **Sonner** - Toast notifications
- **Lucide React** - Icon library

## 🎯 Features Coming Soon

- [ ] View appointment history
- [ ] Upload and view medical documents
- [ ] Real-time queue position updates
- [ ] SMS/Email notifications
- [ ] Video consultations
- [ ] Prescription management
- [ ] Lab results viewing
- [ ] Multi-language support

## 📝 Development Tips

### Adding New Features

1. Create component in appropriate directory
2. Import and use in pages
3. Connect to backend API if needed
4. Add proper TypeScript types
5. Include error handling and loading states
6. Test thoroughly

### Code Style

- Use TypeScript for all new files
- Follow existing component patterns
- Use Tailwind CSS for styling (avoid custom CSS)
- Add proper error handling with try-catch
- Include loading states for async operations
- Use toast notifications for user feedback

### Testing Your Changes

1. Test signup flow
2. Test login flow
3. Test booking an appointment
4. Test logout
5. Test protected routes (try accessing /dashboard when logged out)
6. Test responsive design (mobile view)

## 🆘 Getting Help

1. Check this guide first
2. Review the main project README at repository root
3. Check server logs for API errors
4. Review browser console for frontend errors
5. Check network tab in browser DevTools

## 📄 License

MIT License

---

**Built with ❤️ for Good Health Hospital**
