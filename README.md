# Knowledge Base Chatbot Frontend

A modern, responsive React frontend for a knowledge-based chatbot application built with Vite, TypeScript, and Tailwind CSS.

## Features

- 🔐 **User Authentication** - Secure login/register with JWT tokens
- 🤖 **Interactive Chat Interface** - Clean, intuitive chat UI with message bubbles
- 💬 **Real-time Messaging** - WebSocket-based real-time communication
- 🔄 **Auto-reconnection** - Automatic reconnection with exponential backoff
- 📶 **Connection Status** - Visual indicator for WebSocket connection status
- 👤 **User Management** - Profile display and secure logout
- 📱 **Responsive Design** - Works seamlessly across desktop and mobile devices
- 🎨 **Modern UI/UX** - Beautiful design with Tailwind CSS and custom animations
- 📝 **Markdown Support** - Rich text rendering for bot responses
- ⚡ **Fast Performance** - Built with Vite for optimal development and build speed
- 🔧 **TypeScript** - Full type safety and better developer experience

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful, customizable icons
- **React Markdown** - Markdown rendering for rich content
- **Axios** - HTTP client for API communication

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000
   VITE_APP_NAME=Knowledge Base Chatbot
   VITE_APP_VERSION=1.0.0
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuthWrapper.tsx  # Authentication flow controller
│   ├── LoginForm.tsx    # Login form component
│   ├── RegisterForm.tsx # Registration form component
│   └── ChatMessage.tsx  # Individual chat message component
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state management
├── services/            # API and external service integrations
│   ├── api.ts          # WebSocket and API configuration
│   └── auth.ts         # Authentication API calls
├── types/              # TypeScript type definitions
│   └── index.ts        # Common interfaces and types
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles and Tailwind configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend is designed to work with a FastAPI backend using WebSockets for real-time chat communication. Update the `VITE_API_URL` and `VITE_WS_URL` environment variables to point to your backend service.

### Authentication Endpoints

The application expects the following FastAPI authentication endpoints:

- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/register` - User registration with email/password

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Register Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Authentication Response:**
```json
{
  "access_token": "jwt_token_string",
  "token_type": "bearer"
}
```

### WebSocket Connection

The application connects to the backend via WebSocket at `/ws/chat` endpoint. Authentication is handled via query parameters using JWT tokens.

**WebSocket URL Format:**
```
ws://localhost:8000/ws/chat?token=<jwt_token>
```

### WebSocket Message Format

**Outgoing Message:**
```json
{
  "message": "User's question text"
}
```

**Incoming Message:**
```json
{
  "response": "Bot's response in markdown format",
  "error": "Optional error message"
}
```

## Customization

### Styling
- Modify `tailwind.config.js` to customize colors, animations, and design tokens
- Update `src/index.css` for global styles and component classes

### Components
- Extend `src/types/index.ts` for additional data types
- Add new components in `src/components/`
- Modify `src/services/api.ts` for different API configurations

## Deployment

### Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

### Deploy to Vercel/Netlify:
1. Connect your repository
2. Set environment variables in the platform
3. Deploy with automatic builds on git push

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
