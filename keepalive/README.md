# Azure Function: Keep Render Server Awake

This Azure Function pings your Render server every 5 minutes to prevent it from sleeping on the free tier.

## Setup

1. **Edit `index.js`:**
   - Replace `https://your-render-server-url.com` with your actual Render server URL (e.g., `https://historymap.onrender.com`).

2. **Deploy to Azure Functions:**
   - Deploy this folder (`keepalive/`) as a function app in Azure.
   - Make sure to use Node.js 18+ runtime.

## Files
- `index.js`: Main function code.
- `function.json`: Timer trigger schedule (every 5 minutes).
- `package.json`: Azure Functions entry point config.

## Notes
- No authentication is needed for a simple GET ping.
- You can monitor logs in Azure Portal to confirm pings are working.
