# LEASIFY - Frontend Implementation Guide

## Overview

LEASIFY is a premium AI-powered lease analysis platform with a modern frosted glass design. This document outlines the frontend architecture, design system, and features.

## Technology Stack

- **React 18** - UI framework
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **react-feather** - Icon library
- **jsPDF & html2canvas** - PDF export
- **Chart.js** - Data visualization

## Project Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── Button.jsx       # Button variants (primary, secondary, accent, ghost, danger)
│   ├── Input.jsx        # Text input with icon support
│   ├── GlassCard.jsx    # Glass morphism card component
│   ├── Modal.jsx        # Modal dialogs
│   ├── Alert.jsx        # Alert/notification component
│   ├── DataCard.jsx     # Data display card
│   ├── LoadingSpinner.jsx # Loading indicators
│   ├── Navbar.jsx       # Sidebar navigation
│   ├── ProtectedRoute.jsx # Auth guard for routes
│   └── ChatMessage.jsx, SLASummaryCard.jsx, RiskAnalysisCard.jsx
│
├── context/             # React Context & state management
│   └── AuthContext.jsx  # Authentication state and methods
│
├── services/            # API integration
│   ├── api.js          # All API endpoints
│   └── auth.js         # Auth-specific services
│
├── pages/              # Page components
│   ├── Landing.jsx     # Landing page with 3D car animation
│   ├── Login.jsx       # Login page
│   ├── Signup.jsx      # Signup page
│   ├── Dashboard.jsx   # Main dashboard
│   ├── UploadContractNew.jsx # Contract upload
│   ├── AnalysisPage.jsx # Contract analysis & SLA display
│   ├── ChatAssistantPage.jsx # AI chatbot
│   ├── HistoryPage.jsx # Contract history
│   ├── ComparisonPage.jsx # Multi-contract comparison
│   └── (Legacy pages - to be deprecated)
│
├── App.jsx            # Main app component with routing
├── main.jsx           # React DOM entry point
└── index.css          # Design system & global styles
```

## Design System

### Color Palette

```css
/* Primary Background */
--bg-primary: #0f1419;
--bg-secondary: #1a1f2e;
--bg-tertiary: #232a3a;

/* Accent Colors */
--accent-blue: #3b82f6;
--accent-orange: #f97316;

/* Text Colors */
--text-primary: #f5f5f5;
--text-secondary: #b4b4b8;
--text-tertiary: #71717a;
```

### Key Design Features

- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Smooth Animations**: Slide, fade, and glow animations
- **Responsive Layout**: Works on mobile, tablet, and desktop
- **Premium Typography**: Clean, modern font hierarchy
- **Interactive Elements**: Hover effects and transitions

## Component Library

### Button Component

```jsx
<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>
```

Variants: `primary` | `secondary` | `accent` | `ghost` | `danger`
Sizes: `sm` | `md` | `lg` | `xl`

### Input Component

```jsx
<Input
  type="email"
  label="Email"
  placeholder="you@example.com"
  icon={Mail}
  required
  error={errorMessage}
/>
```

### GlassCard Component

```jsx
<GlassCard hover className="p-6">
  <h3>Card Content</h3>
</GlassCard>
```

### Alert Component

```jsx
<Alert
  type="success|error|warning|info"
  title="Title"
  message="Message"
  onClose={() => setError("")}
/>
```

## Pages Overview

### Landing Page (/)

- Displays brand value proposition
- Left: 3D animated car moving left-to-right
- Right: Auth card with login/signup tabs
- Responsive design for mobile

### Login Page (/login)

- Email and password inputs
- Remember me checkbox
- Social login buttons (UI ready)
- Forgot password link (UI ready)
- Smooth loading screen transition to dashboard

### Signup Page (/signup)

- Full name, email, password inputs
- Form validation
- Terms & conditions checkbox
- Account creation with JWT token storage

### Dashboard (/dashboard)

- Overview cards: Total contracts, pending reviews, average APR, active negotiations
- Quick action cards linking to main features
- Recent contracts list with status badges
- Feature highlights section
- Responsive grid layout

### Upload Contract (/upload)

- Drag-and-drop file upload
- File validation (PDF, JPG, PNG, max 10MB)
- Upload tips sidebar
- Real-time upload status
- Auto-redirect to analysis page

### Analysis Page (/analysis)

- SLA data cards: APR, monthly payment, loan term, total payment
- Vehicle information section
- Risk analysis with severity levels
- Negotiation suggestions
- Download PDF and Share buttons
- Quick links to chatbot and comparison

### Chat Assistant (/chat)

- Message history with timestamps
- Real-time AI responses
- Quick suggestion buttons
- Typing indicator
- Clean conversation interface
- New chat button to reset conversation

### History Page (/history)

- Filter tabs: All, Analyzed, Pending
- Contract list with key metrics
- View and delete actions
- Upload date display
- Deal status badges

### Comparison Page (/comparison)

- Multi-select contracts (2-4)
- Side-by-side metric comparison
- Best deal highlighting
- Deal ratings with stars
- AI recommendations
- Easy metric visualization

## Authentication Flow

1. **Landing Page** → User chooses login or signup
2. **Login/Signup Page** → Form submission to backend API
3. **Token Storage** → JWT stored in localStorage
4. **Protected Routes** → ProtectedRoute component checks auth
5. **Loading Screen** → Smooth transition animation
6. **Dashboard** → User lands on main dashboard

## API Integration

All API calls go through `/services/api.js`. The API client includes:

- Automatic JWT token injection in headers
- Error handling and logging
- Response data extraction

### Available API Functions

```javascript
// Contract operations
uploadContract(file);
extractSLA(documentId);
analyzeContract(documentId);
getContractDetails(documentId);
getUserContracts();
deleteContract(documentId);

// Vehicle data
lookupVIN(vin);
getVehicleByContract(documentId);

// Analysis
getAnalysis(documentId);
compareContracts(contractIds);
generateRiskReport(documentId);

// Chat
chatWithAssistant(message, documentId);
getChatHistory(documentId);

// Reports
generatePDFReport(documentId);
generateCSVReport(documentId);
getReportData(documentId);

// Auth
signup(email, password, fullName);
login(email, password);
getCurrentUser();
```

## Styling Approach

- **Tailwind CSS**: Utility-first framework for rapid UI development
- **Custom CSS**: Global styles in `index.css` for design system variables and animations
- **CSS Variables**: For consistent color and spacing
- **Glassmorphism**: Achieved with backdrop-filter and semi-transparent backgrounds

## Animations

Implemented animations:

- `fadeIn` - Opacity transition
- `slideUp` - Upward slide with fade
- `slideInLeft` - Left-to-right with fade
- `slideInRight` - Right-to-left with fade
- `glow` - Pulsing glow effect
- `pulse-slow` - Slow opacity pulse
- `spin-slow` - Slow rotation
- `carFloat` - Floating car animation
- `carMove` - Car moving across screen

## Environment Variables

Create `.env` file in frontend directory:

```
VITE_API_BASE=http://localhost:8000
VITE_APP_NAME=LEASIFY
```

## Installation & Setup

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation Steps

1. **Install dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**

   ```bash
   npm run dev
   ```

   Access at: http://localhost:5173

3. **Build for production**

   ```bash
   npm run build
   ```

4. **Preview production build**
   ```bash
   npm run preview
   ```

## Frontend Architecture

### State Management

- **Local State**: Component useState for UI state
- **Auth Context**: Global authentication state
- **SessionStorage**: Persist document_id across pages

### Routing Strategy

- Public routes: Landing, Login, Signup
- Protected routes: All dashboard and analysis pages
- Route guards with ProtectedRoute component

### Error Handling

- Try-catch in API calls
- Alert component for user feedback
- Console logging for debugging
- Graceful fallbacks for missing data

## Performance Optimizations

- Lazy loading of images
- Optimized animations with CSS
- Efficient re-renders with React hooks
- Minified production build
- Route-based code splitting ready

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] PDF export functionality
- [ ] Data visualization charts for comparison
- [ ] User profile and settings page
- [ ] Email notifications for new offers
- [ ] Dark/Light theme toggle
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Advanced filters and search

## Troubleshooting

**Issue**: CORS errors connecting to backend

- Solution: Verify backend URL in `.env` and Vite proxy settings

**Issue**: Auth token not persisting

- Solution: Check localStorage permissions in browser settings

**Issue**: Pages not loading

- Solution: Ensure backend API is running and accessible

## Contributing

Follow this process for adding new features:

1. Create feature branch
2. Build component/page
3. Add routing in App.jsx
4. Test functionality
5. Create pull request

## Support

For issues or questions, refer to the backend API documentation or contact the development team.
