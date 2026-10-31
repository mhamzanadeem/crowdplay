# Open the CrowdPlay design preview

Double-click `C:\CrowdPlay\design-preview\index.html` in File Explorer. The prototype is self-contained and works without a server or installation. Keep index.html, style.css and app.js together.

Alternatively, from PowerShell:

```powershell
cd C:\CrowdPlay
node design-preview/serve.mjs
```

Then open http://127.0.0.1:4173 in your browser. Ctrl+C stops the server.

Try Overview → Moderation Inbox → open a message → inspect context/distributions → Mark as safe → Cancel or Confirm. Counts and analytics update after confirmed demo reviews. Search, risk/review filters, sorting, viewer history, rule switches and sensitivity controls work locally. Changes reset on reload. Settings shows the planned integrations as disconnected.

All content, users, probabilities and behaviour signals are synthetic. No external APIs, credentials, database, or real Twitch moderation actions are present. The data model contains 248 messages and eight initial flags; metrics and charts derive from those fixtures. Only local text rendering is used; no external assets are needed.

Verification: JavaScript syntax checks and isolated VM state checks passed. Browser preview authority was declined, so actual rendering, keyboard interaction, responsive layout and native dialog behaviour have not been visually verified. No screenshots available. Local server printed its URL, but an HTTP readiness probe was blocked by socket permissions; use the direct-file method if local networking is unavailable.

Design approval is required before Task 3. Next.js, backend integrations and migrations have not started.
