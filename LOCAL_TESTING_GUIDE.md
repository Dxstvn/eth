# Local Testing Guide - Frontend with Backend

This guide explains how to run the ClearHold frontend with a local backend server for development and testing.

## Prerequisites

- Node.js v18+ installed
- Both frontend and backend repositories cloned
- `.env.local` file created (already done)

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm install
npm run dev
```

The backend will start on `http://localhost:3000`

### 2. Start the Frontend

In a new terminal:

```bash
cd /Users/dustinjasmin/eth-1
npm install
npm run dev
```

The frontend will start on `http://localhost:3001` (Next.js automatically uses port 3001 when 3000 is taken)

### 3. Verify Connection

1. Open your browser to `http://localhost:3001`
2. Open the browser's Developer Tools (F12)
3. Go to the Network tab
4. Try signing in or performing any action
5. You should see API requests going to `http://localhost:3000`

## Configuration Details

### Frontend Configuration (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

This tells the frontend to use your local backend instead of the production API.

### Backend Configuration

The backend is already configured to accept requests from localhost:
- CORS allows `http://localhost:3000` and `http://localhost:5173`
- Authentication works in test mode
- Rate limits are reasonable for development

## Testing Features

### 1. Authentication

The backend supports multiple authentication methods:
- Email/Password login
- Google Sign-In
- Passwordless authentication (new feature)

In test mode, you can use:
- Email: `testuser.a@example.com`
- Password: `testpassword123`

### 2. Firebase Emulators

For complete local testing with Firebase services:

```bash
cd backend
npm run firebase:emulators
```

This starts:
- Firestore emulator on port 5004
- Auth emulator on port 9099
- Storage emulator on port 9199

### 3. Test Tokens

The backend accepts test tokens in development:
- Format: `test-token-userId`
- Example: `test-token-user123`

## Common Issues & Solutions

### Issue: CORS Error

**Solution**: Make sure the backend is running and the URL in `.env.local` is correct.

### Issue: Authentication Failed

**Solution**: The backend might be expecting specific headers. Check that your auth token is being sent correctly.

### Issue: Port Conflicts

**Solution**: If port 3000 is already in use:
1. Change the backend port: `PORT=3001 npm run dev`
2. Update `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3001`

### Issue: API Not Found (404)

**Solution**: Check that the API endpoint exists in the backend. The frontend expects endpoints like:
- `/auth/signInEmailPass`
- `/transaction/transactions`
- `/wallet/`

## Security Notes

- Local testing bypasses some security measures
- Never commit `.env.local` to Git
- Test tokens only work in development mode
- Rate limits are relaxed but still enforced

## Passwordless Authentication Testing

The new passwordless authentication feature requires:
1. Backend running with email configuration
2. Frontend passwordless components (already created)
3. Valid SMTP settings in backend (for sending emails)

To test without real emails:
- Check backend logs for the magic link
- Use the link directly in your browser

## Next Steps

1. Run the backend and frontend
2. Test basic authentication
3. Verify API calls in Network tab
4. Test specific features you're working on

Remember: This setup is for local development only. Production deployments have different configurations and security measures.