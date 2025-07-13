# 🔧 Deployment Instructions - Frontend Fix

## Problem Solved
The server was not configured to serve the React frontend, causing "Route GET / not found" errors.

## Changes Made
- Added static file serving middleware for React app
- Added React Router support for SPA routing
- Maintained proper API error handling

## Deployment Steps

### Option 1: Using Coolify (Recommended for Production)
1. **Commit the changes** to your repository
2. **Push to main branch**
3. **Deploy via Coolify** - it should automatically detect and deploy the changes
4. **Monitor the deployment** for any issues

### Option 2: Manual Docker Build
If you have access to the server:

```bash
# Navigate to project directory
cd /path/to/aspose-slides-25.6-nodejs

# Build and restart the production container
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up --build -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f
```

### Option 3: Quick Local Test
To test changes locally:

```bash
# Build frontend
cd client
npm install
npm run build

# Start server in development
cd ../server
npm install
npm run dev
```

## Verification
After deployment, verify:
1. **Frontend loads**: https://luna.anlaklab.com/ shows the React app
2. **API works**: https://luna.anlaklab.com/api/v1/health returns JSON
3. **Documentation**: https://luna.anlaklab.com/api/v1/docs works
4. **File processing**: Upload functionality works correctly

## Troubleshooting

### If frontend still shows error:
1. Check that `client/dist/` contains built files
2. Verify Docker image includes frontend files
3. Check nginx configuration in `server/nginx/conf.d/default.conf`

### If API breaks:
1. Check server logs for errors
2. Verify all API routes still work
3. Test with curl: `curl https://luna.anlaklab.com/api/v1/health`

## Key Files Changed
- `server/src/index.ts` - Added frontend serving configuration
- This file serves as deployment guide

## Next Steps
1. Deploy the changes to production
2. Test the application thoroughly
3. Monitor for any issues
4. Consider adding frontend build to Docker image if not already included

---
**Note**: The frontend is already built and available in `client/dist/`. The server now properly serves it for all non-API routes while maintaining API functionality. 