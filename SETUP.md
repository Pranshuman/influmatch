# Instagram API Integration Setup Guide

## Prerequisites

1. **Instagram Business/Creator Account**: Your Instagram account must be converted to Business or Creator type
2. **Facebook Page**: Create a Facebook Page and link it to your Instagram account
3. **Meta Developer Account**: Sign up at [developers.facebook.com](https://developers.facebook.com)

## Environment Variables

Create a `.env` file in the root directory with:

```env
# Instagram Graph API Configuration
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here
APP_BASE_URL=http://localhost:5050
PORT=5050
```

## Meta App Setup

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create a new app → "Business" type
3. Add "Instagram Basic Display" product
4. Configure OAuth redirect URIs:
   - `http://localhost:5050/auth/instagram/callback`
5. Get your App ID and App Secret from Settings → Basic

## Running the Application

### Backend
```bash
# Install dependencies
npm install

# Start the server
npm run dev
# or
node server.js
```

### Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Testing the Integration

1. **Backend Test**: Run `node test-api.js` to verify backend endpoints
2. **Frontend Test**: Open `http://localhost:3000` and follow the UI instructions
3. **Full Flow**: 
   - Click "Connect Instagram Account"
   - Complete OAuth flow
   - Test fetching profile, media, and insights

## API Endpoints

- `GET /` - Homepage with links
- `GET /health` - Health check
- `GET /auth/instagram/start` - Start OAuth flow
- `GET /auth/instagram/callback` - OAuth callback
- `GET /me/ig-user` - Get Instagram profile
- `GET /me/media` - Get recent media
- `GET /me/ig-insights` - Get account insights

## Troubleshooting

### Common Issues

1. **"No Instagram account linked"**: Ensure your Instagram is Business/Creator and linked to a Facebook Page
2. **OAuth errors**: Check your redirect URI matches exactly in Meta App settings
3. **CORS issues**: The frontend runs on port 3000, backend on 5050 - this is expected
4. **Token expired**: Instagram tokens expire after ~60 days, re-authenticate

### Debug Mode

Add `DEBUG=true` to your `.env` file for detailed logging.
