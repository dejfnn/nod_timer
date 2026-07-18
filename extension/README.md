# TimeFlow browser extension

Minimal Chrome/Edge (Manifest V3) extension: sign in to your TimeFlow backend
once, then start/stop the running timer from the toolbar popup.

## Install (unpacked)

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Click the TimeFlow icon, fill in your backend URL
   (e.g. `https://your-backend.up.railway.app`), email and password.

## Notes

- The token is stored in `chrome.storage.local` and reused until it expires
  (30 days) or you sign out.
- `host_permissions` lets the popup call your backend directly, so no CORS
  configuration is needed on the server.
- Description edits while the timer runs are synced (debounced) to the server.
