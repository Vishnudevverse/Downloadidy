# Downloadidy

**Take control of your downloads. Automatically route, rename, and organize files based on custom rules, keywords, and domains.**

Downloadidy is a minimal, privacy-friendly download director that keeps your filesystem tidy. It applies smart rules to every download so you spend less time moving and renaming files.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

- **Rule stacking:** Domain, file type, date, keyword, and custom-path rules you can reorder with drag-and-drop.
- **Blob/Data aware:** Captures the active tab domain for `blob:` and `data:` downloads (common with AI/image generators) so they file correctly.
- **One-time rename:** Rename the very next download without changing your long-term rules.
- **Site-specific overrides:** Flip off “Global” to tailor rules per site without touching your defaults.
- **Keyword triggers:** Route files by filename matches; first matching rule wins.
- **Offline-friendly:** Runs locally; no servers involved.

## 🚀 Installation

### From Source (Load Unpacked)

1. Clone or download this repository.
2. Open your browser’s extensions page:
   - **Chrome:** `chrome://extensions/`
   - **Edge:** `edge://extensions/`
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. In browser settings, disable **“Ask where to save each file before downloading”** for seamless routing.

## Usage

- Click the extension icon to open the popup.
- Toggle **Global** on/off to switch between global rules and site-specific rules.
- Drag the `☰` handles to reorder rules; earlier rules create higher folders.
- Use **Next Download Name** for a one-off rename, then download your file.
- Watch **Path Preview** to confirm where files will land before you download.

## Project Structure

```
├── manifest.json       Extension manifest (V3)
├── index.html          Popup UI
├── css/
│   └── popup.css       Styles for the popup
├── js/
│   ├── background.js   Download routing logic
│   └── popup.js        UI logic and rule ordering
└── assets/             (placeholders for icons/screenshots)
```

## Permissions

| Permission | Purpose |
|---|---|
| `downloads` | Intercept filenames and apply routing rules |
| `storage` | Persist settings and rule order locally |
| `activeTab` | Resolve domains for `blob:`/`data:` downloads |

## How It Works

Downloadidy builds a folder path by applying your rules in order, then appends the filename:

```
[By Domain]/[By Date]/[By File Type]/<filename>
```

Example (domain -> date -> type):

```
google/2026-Mar/PNG Image/file.png
```

If a download URL is `blob:` or `data:`, Downloadidy resolves the domain from your active tab to avoid falling back to `Other`.

## Roadmap

- Regex support for keyword rules
- “Test mode” to preview routing without moving files
- Dedicated options page for advanced configuration
- Additional file type categories

## Changelog

**v1.6.0 (current)**
- Fix: `blob:`/`data:` downloads now use the active tab domain instead of defaulting to `Other`.
- Docs: README/FAQ/Help refreshed for production use.
- Chore: Folder structure reorganized into `js/`, `css/`, `assets/`.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m "Add some AmazingFeature"`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## Privacy

Downloadidy runs locally in your browser. It does not collect, transmit, or sell personal data. All settings remain on your device.

## License

This project is licensed under the MIT License. See `LICENSE` for details.