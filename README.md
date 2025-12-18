# Karl Selfie Generator 📸🪵

Eine interaktive Web-App, die dein Selfie mit "Karl dem Kasten" (einem hölzernen Charakter) in absurden KI-generierten Szenen kombiniert.

## Features

- 📷 Fullscreen Kamera-Interface mit Live-Preview
- 🔄 Kamera-Wechsel (Front/Back)
- ✨ KI-Bildgenerierung mit OpenAI gpt-image-1
- 💾 Download der generierten Bilder
- 📱 Mobile-optimiert (PWA-ready)
- 🎨 Apple-inspiriertes minimalistisches Design

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js Runtime)
- **KI:** OpenAI Images API (gpt-image-1)
- **Deployment:** Vercel

## Setup

### Lokal

1. **Repository klonen:**
   ```bash
   git clone <repo-url>
   cd karl-selfie-generator
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **OpenAI API Key einrichten:**
   
   **Option A - Umgebungsvariable (empfohlen):**
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```
   
   **Option B - key.txt Datei:**
   Erstelle eine `key.txt` Datei im Root-Verzeichnis:
   ```
   api_key
   sk-proj-xxxxxxxxxx
   ```
   
   ⚠️ **WICHTIG:** `key.txt` ist in `.gitignore` - niemals committen!

4. **Karl-Referenzbild:**
   - Lege ein Bild von "Karl dem Kasten" in `Referenz/` ab
   - Unterstützte Namen: `karl.png`, `karl.jpg`, `karl1.jpg`, etc.

5. **App starten:**
   ```bash
   npm run dev
   ```
   
   Öffne [http://localhost:3000](http://localhost:3000)

### Vercel Deployment

1. **Repository auf GitHub pushen**

2. **In Vercel importieren:**
   - Neues Projekt von GitHub importieren
   - Framework: Next.js (automatisch erkannt)

3. **Environment Variables setzen:**
   - Gehe zu Project Settings → Environment Variables
   - Füge hinzu: `OPENAI_API_KEY` = `sk-...`

4. **Deploy!**

## Projektstruktur

```
├── app/
│   ├── api/
│   │   └── render/
│   │       └── route.ts    # Backend API für Bildgenerierung
│   ├── globals.css         # Globale Styles
│   ├── layout.tsx          # Root Layout
│   └── page.tsx            # Kamera UI
├── lib/
│   ├── camera.ts           # Kamera-Utilities
│   └── prompts.ts          # Prompt-Management
├── Referenz/
│   └── karl*.jpg/png       # Karl Referenzbilder
├── karl_und_user_absurde_prompts.txt  # Szenen-Prompts
├── key.txt                 # ⚠️ NICHT COMMITTEN
└── ...
```

## Prompt-Format

Die Datei `karl_und_user_absurde_prompts.txt` enthält nummerierte Szenen:

```
1. Der Nutzer und Karl der Kasten sitzen als riesige Götter auf einer schwimmenden Pizza...
2. Karl der Kasten ist ein grimmiger Barista...
```

Das Backend wählt zufällig eine Szene aus und kombiniert sie mit:
- Karl-Beschreibung (Holz-Charakter mit Schrauben)
- User-Beschreibung (Gesicht vom Selfie erhalten)
- Realismus-Anweisungen

## API

### POST /api/render

**Request:** `multipart/form-data`
- `selfie`: File (JPEG/PNG vom Canvas)
- `sceneIndex`: number (optional, sonst random)

**Response:**
```json
{
  "imageBase64": "base64-encoded-png",
  "promptUsed": "Szenen-Beschreibung",
  "fullPrompt": "Kompletter Prompt an OpenAI"
}
```

## Lizenz

MIT

---

Made with ❤️ and 🪵

