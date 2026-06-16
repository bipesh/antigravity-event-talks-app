from flask import Flask, render_template, jsonify, request
import requests
import xml.etree.ElementTree as ET
import re
import html
import time

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for the parsed releases
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_TTL = 300 # 5 minutes

def clean_html_to_text(html_str):
    """Strips HTML tags and unescapes HTML entities to get clean text."""
    if not html_str:
        return ""
    # Strip HTML tags
    text = re.sub(r'<[^>]+>', '', html_str)
    # Unescape entities
    text = html.unescape(text)
    # Collapse multiple whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_xml_feed(xml_content):
    """Parses the BigQuery Atom feed XML and extracts individual updates."""
    try:
        root = ET.fromstring(xml_content)
        # Atom namespace
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        entries = root.findall("atom:entry", ns)
        parsed_updates = []
        
        # We assign an ID to each sub-update to make client-side handling easy
        update_id_counter = 0
        
        for entry in entries:
            date_str = entry.find("atom:title", ns).text
            updated_time = entry.find("atom:updated", ns).text
            link_el = entry.find("atom:link", ns)
            link = link_el.attrib.get("href", "") if link_el is not None else ""
            
            content_el = entry.find("atom:content", ns)
            content_html = content_el.text if content_el is not None else ""
            
            if not content_html:
                continue
                
            # Split the content by <h3> tags which separate different types of updates in the same entry
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            
            # If there are no <h3> tags, parse the whole block as one General update
            if len(parts) <= 1:
                update_id_counter += 1
                parsed_updates.append({
                    "id": f"up-{update_id_counter}",
                    "date": date_str,
                    "updated_raw": updated_time,
                    "link": link,
                    "type": "General",
                    "body_html": content_html.strip(),
                    "body_text": clean_html_to_text(content_html)
                })
                continue
                
            # Alternate elements in parts: [pre-h3-text, type, body, type, body, ...]
            for i in range(1, len(parts), 2):
                update_type = parts[i].strip()
                body_html = parts[i+1].strip() if i+1 < len(parts) else ""
                
                # Check for an anchor in the link, or append the date to keep links accurate
                sub_link = link
                if "#" not in sub_link:
                    # e.g., link#June_15_2026
                    anchor_date = date_str.replace(" ", "_").replace(",", "")
                    sub_link = f"{link}#{anchor_date}"
                
                update_id_counter += 1
                parsed_updates.append({
                    "id": f"up-{update_id_counter}",
                    "date": date_str,
                    "updated_raw": updated_time,
                    "link": sub_link,
                    "type": update_type,
                    "body_html": body_html,
                    "body_text": clean_html_to_text(body_html)
                })
                
        return parsed_updates
    except Exception as e:
        print(f"Error parsing XML feed: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_releases(bypass_cache=False):
    """Fetches the XML feed (using cache if appropriate) and returns parsed releases."""
    now = time.time()
    
    if not bypass_cache and cache["data"] is not None and (now - cache["last_fetched"] < CACHE_TTL):
        return cache["data"], "cached"
        
    try:
        response = requests.get(FEED_URL, timeout=10)
        if response.status_code == 200:
            releases = parse_xml_feed(response.content)
            cache["data"] = releases
            cache["last_fetched"] = now
            return releases, "fresh"
        else:
            # Fallback to cache if request fails
            if cache["data"] is not None:
                return cache["data"], "fallback_cache"
            return [], f"error_status_{response.status_code}"
    except Exception as e:
        if cache["data"] is not None:
            return cache["data"], "fallback_cache"
        return [], f"error_exception_{str(e)}"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def api_releases():
    # Allow forcing a refresh by passing ?refresh=true
    force_refresh = request.args.get("refresh", "").lower() == "true"
    releases, source = get_releases(bypass_cache=force_refresh)
    return jsonify({
        "status": "success",
        "source": source,
        "count": len(releases),
        "timestamp": time.time(),
        "releases": releases
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
