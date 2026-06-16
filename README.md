# BigQuery Release Explorer

A modern, responsive, and feature-rich web dashboard to track, search, filter, and share Google Cloud BigQuery updates. 

This application parses the official BigQuery RSS Feed, separates daily compound entries into atomic release updates (Features, Changes, Issues, Deprecations), and serves them in a premium glassmorphic interface.

---

## ✨ Features

- **Atom RSS Feed Ingestion**: Connects directly to the official Google Cloud BigQuery RSS feed.
- **Smart Partitioning**: Automatically parses composite daily updates into individual announcements by splitting on subheadings (`<h3>`).
- **5-Minute TTL Cache**: Protects downstream servers and speeds up requests using an in-memory caching system.
- **Live Search & Filtering**: Match updates instantly by query string, type (Feature, Change, Issue, Deprecated), and sort order.
- **X (Twitter) Share Modal**: Generates pre-populated, character-safe tweets with custom progress indicators and direct integration using X Web Intents.
- **Modern Glassmorphic UI**: Beautiful dark-mode dashboard styled with CSS animations, custom SVGs, and responsive grids.

---

## 🛠️ Technology Stack

- **Backend**: Python, Flask, requests, XML ElementTree
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **Environment**: Virtual Environment (`venv`) pre-configured with dependencies

---

## 📁 Project Structure

```text
├── app.py              # Main Flask server (cache, parsing, REST endpoints)
├── fetch_feed.py       # Debugging CLI tool to parse RSS feeds
├── static/
│   ├── css/
│   │   └── style.css   # Main layout, typography, and styling
│   └── js/
│       └── main.js     # State management, events, API calls, and animations
├── templates/
│   └── index.html      # Main HTML page (layout, skeletons, modals)
├── venv/               # Pre-installed python virtual environment
└── .gitignore          # Rules for ignoring virtual env, metadata, and caches
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have **Python 3** installed on your system.

### Running the Application

1. **Activate the Virtual Environment**:
   ```bash
   # On macOS/Linux:
   source venv/bin/activate

   # On Windows:
   venv\Scripts\activate
   ```

2. **Run the Flask Server**:
   ```bash
   python app.py
   ```

3. **Open the Explorer**:
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

---

## ⚡ API Endpoints

- **`GET /`**: Serves the main user interface.
- **`GET /api/releases`**: Returns a JSON array of all parsed updates.
  - *Optional parameter:* `?refresh=true` to force a cache bypass and fetch a fresh copy of the feed.

---

## 📝 License

This project is open-source and available under the MIT License.
