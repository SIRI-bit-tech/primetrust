# PrimeTrust Frontend

A modern, responsive banking web application built with Next.js 14, TypeScript, and Tailwind CSS. Provides a comprehensive banking experience with real-time updates, secure authentication, and intuitive user interface.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS and DaisyUI
- **Real-time Banking**: Live balance updates and transaction notifications
- **Secure Authentication**: JWT-based authentication with automatic token refresh
- **Virtual Cards**: Generate and manage virtual debit cards
- **Money Transfers**: Peer-to-peer transfers with real-time confirmation
- **Investment Platform**: Stock and cryptocurrency trading interface
- **Loan Management**: Apply for and manage personal loans
- **Bill Payments**: Automated bill payment system
- **Mobile Responsive**: Optimized for all device sizes
- **Dark/Light Mode**: Theme switching capability
- **Accessibility**: WCAG compliant design

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Authentication**: JWT tokens
- **Build Tool**: Vite (via Next.js)

## 📋 Prerequisites

- Node.js 18.0+
- npm or yarn
- Modern web browser
- Backend API running (see backend README)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PrimeTrust/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_APP_NAME=PrimeTrust
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── login/             # Authentication pages
│   │   ├── register/          # Registration pages
│   │   ├── help-center/       # Support pages
│   │   ├── contact-us/        # Contact pages
│   │   ├── security/          # Security information
│   │   ├── privacy-policy/    # Privacy policy
│   │   ├── about-us/          # About page
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/            # Reusable components
│   │   ├── DashboardLayout.tsx
│   │   └── AuthProvider.tsx
│   ├── hooks/                 # Custom React hooks
│   │   └── useAuth.ts
│   ├── lib/                   # Utility functions
│   │   ├── api.ts            # API client
│   │   └── utils.ts          # Helper functions
│   └── types/                # TypeScript type definitions
│       └── index.ts
├── public/                   # Static assets
├── package.json             # Dependencies and scripts
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## 🎨 Styling

### Tailwind CSS Configuration

The project uses Tailwind CSS with custom configuration:

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#1e3a8a',
        'primary-navy': '#1e40af',
      }
    }
  },
  plugins: [require('daisyui')],
}
```

### Custom Components

- **DashboardLayout**: Main layout for authenticated users
- **AuthProvider**: Authentication context provider
- **Form Components**: Reusable form elements with validation

## 🔐 Authentication

The application uses JWT-based authentication with automatic token refresh:

```typescript
// Example usage
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, login, logout } = useAuth()
  
  // User is automatically authenticated if valid token exists
  if (!user) {
    return <LoginForm />
  }
  
  return <Dashboard />
}
```

## 📱 Pages Overview

### Public Pages
- **Landing Page** (`/`): Marketing page with features and testimonials
- **Login** (`/login`): User authentication
- **Register** (`/register`): User registration with email verification
- **Help Center** (`/help-center`): FAQ and support information
- **Contact Us** (`/contact-us`): Contact form and information
- **Security** (`/security`): Security features and best practices
- **Privacy Policy** (`/privacy-policy`): Privacy information
- **About Us** (`/about-us`): Company information

### Protected Pages (Dashboard)
- **Dashboard** (`/dashboard`): Main dashboard with overview
- **Virtual Cards** (`/dashboard/cards`): Card management
- **Transfer Money** (`/dashboard/transfer`): Money transfers
- **Loans** (`/dashboard/loans`): Loan applications and management
- **Investments** (`/dashboard/investments`): Investment platform
- **Pay Bills** (`/dashboard/bills`): Bill payment system
- **Transactions** (`/dashboard/transactions`): Transaction history
- **Profile** (`/dashboard/profile`): User profile management

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Code Quality

- **ESLint**: Code linting with Next.js recommended rules
- **TypeScript**: Static type checking
- **Prettier**: Code formatting (configured via ESLint)

### API Integration

The frontend communicates with the backend via the API client:

```typescript
// Example API usage
import { authAPI, bankingAPI } from '@/lib/api'

// Login
const response = await authAPI.login({ email, password })

// Get balance
const balance = await bankingAPI.getBalance()

// Transfer money
const transfer = await bankingAPI.initiateTransfer(transferData)
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Testing Strategy

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API integration testing
- **E2E Tests**: User flow testing with Playwright

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel dashboard**

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- **Netlify**: Use `npm run build` and deploy the `out` directory
- **AWS Amplify**: Connect repository and configure build settings
- **Docker**: Use the provided Dockerfile

### Environment Variables

Production environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.primetrust.com/api
NEXT_PUBLIC_APP_NAME=PrimeTrust
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## 🔒 Security

- **HTTPS Only**: All API calls use HTTPS
- **JWT Tokens**: Secure authentication with automatic refresh
- **Input Validation**: Client-side validation with Zod
- **XSS Protection**: Built-in Next.js security features
- **CSP Headers**: Content Security Policy headers
- **Secure Headers**: Security headers via Next.js config

## 📊 Performance

- **Code Splitting**: Automatic code splitting by Next.js
- **Image Optimization**: Next.js Image component optimization
- **Lazy Loading**: Components loaded on demand
- **Caching**: API response caching
- **Bundle Analysis**: Regular bundle size monitoring

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use functional components with hooks
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@primetrust.com or create an issue in the repository.

## 🔗 Links

- [Backend Repository](../backend)
- [Live Demo](https://primetrust.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
