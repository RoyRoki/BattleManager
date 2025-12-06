# BattleManager

A mobile-first Progressive Web App (PWA) for managing Free Fire tournaments. Includes user enrollment via points, secure credential sharing, real-time chat, manual payments, and admin controls.

## Features

- 🎮 **Tournament Management**: Create and manage Free Fire tournaments
- 💰 **Points System**: Users can add money, enroll in tournaments, and withdraw points
- 🔐 **Secure Credentials**: Encrypted tournament credentials with timed reveal
- 💬 **Real-time Chat**: Global chat powered by Firebase Realtime Database
- 👤 **User Management**: OTP-based authentication and profile management
- 🔒 **Admin Dashboard**: Full admin controls for tournaments, users, and payments
- 📱 **PWA**: Installable Progressive Web App for mobile devices

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom gaming theme
- **Backend**: Firebase (Firestore, Realtime DB, Auth)
- **State Management**: React Context API
- **Animations**: Framer Motion
- **Audio**: Howler.js
- **Validation**: Zod
- **Routing**: React Router DOM
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project configured
- Cloudinary account (for image uploads)
- Fast2SMS API key (for OTP)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BattleManager
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file in the root directory:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=your_database_url

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_API_SECRET=your_api_secret

# Admin Configuration
VITE_ADMIN_EMAIL=admin@example.com

# Encryption Key (optional, defaults to a basic key)
VITE_ENCRYPTION_KEY=your_encryption_key
```

4. Set up Vercel environment variables for serverless function:
```env
VERCEL_FAST2SMS_API_KEY=your_fast2sms_api_key
```

5. Deploy Firebase security rules:
```bash
firebase deploy --only firestore:rules,database:rules
```

6. Start development server:
```bash
npm run dev
```

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Realtime Database
4. Enable Authentication (for admin users)
5. Set up Firestore indexes as specified in `firestore.indexes.json`
6. Deploy security rules from `firestore.rules` and `database.rules.json`

### Admin Setup

1. Create an admin user in Firebase Authentication (email/password)
2. Set custom claims using Firebase Admin SDK:
```javascript
admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```
3. Set `VITE_ADMIN_EMAIL` in environment variables

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── hooks/          # Custom React hooks
├── pages/          # Route-based pages
│   └── admin/      # Admin pages
├── services/       # API services (Firebase, OTP, Cloudinary, UPI)
├── types/          # TypeScript type definitions
└── utils/          # Utility functions (validation, encryption, constants)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Deployment

### Vercel

1. Push code to GitHub
2. Import project to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

The app will automatically deploy on push to main branch.

### Firebase Functions

For OTP service, deploy the serverless function in `api/send-otp.ts` to Vercel or Firebase Functions.

## Security Notes

- Never commit `.env.local` file
- Use strong encryption keys for production
- Regularly update dependencies
- Review Firebase security rules before deploying

## License

MIT
