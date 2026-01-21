# How to Deploy Your CSM Forecast Planner to Vercel

## What You'll Get
A live URL like: `https://csm-forecast-planner.vercel.app` where you can access your app from anywhere!

## Prerequisites
- A GitHub account (free) - [Sign up here](https://github.com)
- A Vercel account (free) - [Sign up here](https://vercel.com)

## Step-by-Step Deployment

### Option A: Deploy via Vercel Dashboard (Easiest - No Code Required!)

1. **Download the deployment package**
   - I've created all the files you need
   - Download the entire `deployment-package` folder

2. **Create a GitHub repository**
   - Go to [github.com](https://github.com)
   - Click the "+" icon → "New repository"
   - Name it: `csm-forecast-planner`
   - Make it Public
   - Click "Create repository"

3. **Upload files to GitHub**
   - On your new repository page, click "uploading an existing file"
   - Drag and drop ALL files from the deployment-package folder
   - Click "Commit changes"

4. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login (use "Continue with GitHub")
   - Click "Add New..." → "Project"
   - Import your `csm-forecast-planner` repository
   - Click "Deploy"
   - Wait 2-3 minutes... Done! 🎉

5. **Update Google Cloud Console**
   - Copy your new Vercel URL (e.g., `https://csm-forecast-planner.vercel.app`)
   - Go back to Google Cloud Console
   - APIs & Services → Credentials → Your OAuth Client
   - Add to "Authorized JavaScript origins": Your Vercel URL
   - Add to "Authorized redirect URIs": Your Vercel URL
   - Click Save

6. **Access your app!**
   - Visit your Vercel URL
   - Click "Connect to Google Sheets"
   - You're live! 🚀

### Option B: Deploy via Command Line (For Developers)

If you have Node.js and Git installed:

```bash
# 1. Navigate to the deployment-package folder
cd deployment-package

# 2. Install dependencies
npm install

# 3. Test locally (optional)
npm run dev
# Visit http://localhost:5173

# 4. Install Vercel CLI
npm install -g vercel

# 5. Deploy
vercel

# Follow the prompts, then visit your live URL!
```

## Troubleshooting

**"Google API failed to load"**
- Make sure you added your Vercel URL to Google Cloud Console authorized origins
- Wait 30-60 seconds after updating Google Console, then refresh

**"Build failed on Vercel"**
- Check that all files were uploaded to GitHub
- Make sure the folder structure is correct (package.json in root)

**Can't connect to Google Sheets**
- Verify your Client ID and Sheet ID are correct in `src/App.jsx`
- Check that authorized origins match your Vercel URL exactly (including https://)

## What's Included in Your Deployment Package

```
deployment-package/
├── index.html              # Main HTML file
├── package.json            # Dependencies
├── vite.config.js          # Build configuration
├── tailwind.config.js      # Styling configuration
├── postcss.config.js       # CSS processing
└── src/
    ├── main.jsx            # App entry point
    ├── App.jsx             # Your main app (with Google credentials)
    └── index.css           # Tailwind styles
```

## Next Steps After Deployment

1. Share the URL with your team
2. Have each CSM add their customer data
3. Enable auto-sync for real-time updates
4. Export reports as needed

## Cost
Everything is FREE:
- Vercel: Free tier (plenty for this app)
- GitHub: Free for public repos
- Google Sheets API: Free

Enjoy your live CSM Forecast Planner! 🎯
