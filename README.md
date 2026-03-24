<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/deeaf85d-1c24-47d5-9a3c-9a53bb3f6e05

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Netlify

### Automatic Deployments via GitHub Actions

This repository includes two GitHub Actions workflows:

- **Production deploy** (`.github/workflows/netlify-deploy.yml`): Runs on every push to `main` and deploys the production build to Netlify.
- **Preview deploy** (`.github/workflows/netlify-preview.yml`): Runs on every pull request and deploys a preview build to Netlify, then posts the preview URL as a comment on the PR.

### Required GitHub Secrets

Add these secrets in your GitHub repository settings (**Settings → Secrets and variables → Actions**):

| Secret | Description |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Your Netlify personal access token ([create one here](https://app.netlify.com/user/applications#personal-access-tokens)) |
| `NETLIFY_SITE_ID` | The API ID of your Netlify site (found in **Site settings → General → Site details**) |
| `GEMINI_API_KEY` | Your Gemini API key |

### Required GitHub Variables (for preview comments)

Add this variable in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description |
|---|---|
| `NETLIFY_SITE_NAME` | The subdomain of your Netlify site (e.g. `facturas-do` for `facturas-do.netlify.app`) |

### Manual Deploy

You can also deploy manually using the [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify login
netlify deploy --dir=dist --prod   # production
netlify deploy --dir=dist          # preview
```

### Firebase: Enable Google Login on Netlify

Google Login uses Firebase Authentication with a redirect flow. For it to work on your Netlify domain, you must add that domain to Firebase's **Authorized Domains** list:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to **Authentication → Settings → Authorized domains**.
4. Click **Add domain** and enter your Netlify domain (e.g. `your-site.netlify.app`).
5. Also add any PR preview domains if needed (e.g. `pr-1--your-site.netlify.app`).

> **Note:** Google login is already enabled in the Firebase project. Only the authorized domain step above is needed to make it work from Netlify.
