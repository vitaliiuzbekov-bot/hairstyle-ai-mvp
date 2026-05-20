# AI Hairstyle Generator - Render Deployment

## Overview
This is a production-ready Next.js (Express + Vite) application for AI hairstyle generation. It uses LightX AI as the primary provider with automatic fallbacks to Hugging Face and ModelsLab. All API keys are securely managed on the server side via environment variables.

## Environment Variables
Configure the following in your Render dashboard (or `.env.local` for local development):

- `GEMINI_API_KEY`: Required for style analysis (text generation). Note: Requires a paid/billing-enabled Gemini key if you want to use Gemini as the final image fallback.
- `LIGHTX_API_KEY`: Primary AI Hairstyle Provider key. Obtain from https://www.lightxeditor.com/api (Dashboard -> API Keys).
- `HUGGINGFACE_API_KEY`: Fallback Provider 1. Get from https://huggingface.co/settings/tokens.
- `MODELSLAB_API_KEY`: Fallback Provider 2.

## Deployment on Render
1. Connect this repository to Render.
2. Select "Web Service" and setup as Node.js environment.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Add the Environment Variables under the "Environment" tab.

## Local Development
1. Clone the repository.
2. Create `.env.local` using `.env.example` as a template.
3. Run `npm install`
4. Run `npm run dev`
5. Visit `http://localhost:3000`

## Architecture & Security
- **No CORS Issues**: All external API calls are made from the `server.ts` backend. The frontend only communicates with the `/api/*` endpoints.
- **Secure Credentials**: API Keys are safely stored in the backend and never exposed to the client.
- **Resilient AI Pipeline**: Uses a robust fallback chain (LightX -> ModelsLab -> HuggingFace -> Gemini) to maintain high availability.
