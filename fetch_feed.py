import requests
import xml.etree.ElementTree as ET
import re
import html

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_to_text(html_str):
    text = re.sub(r'<[^>]+>', '', html_str)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_content(content_html):
    if not content_html:
        return []
    parts = re.split(r'<h3>(.*?)</h3>', content_html)
    sub_updates = []
    for i in range(1, len(parts), 2):
        update_type = parts[i].strip()
        body_html = parts[i+1].strip() if i+1 < len(parts) else ""
        sub_updates.append({
            "type": update_type,
            "body_html": body_html,
            "body_text": clean_html_to_text(body_html)
        })
    return sub_updates

try:
    response = requests.get(url, timeout=10)
    root = ET.fromstring(response.content)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    entries = root.findall("atom:entry", ns)
    print("Parsed total entries:", len(entries))
    
    total_sub_updates = 0
    for idx, entry in enumerate(entries[:3]):
        title = entry.find("atom:title", ns).text
        updated = entry.find("atom:updated", ns).text
        link = entry.find("atom:link", ns).attrib.get("href", "")
        content = entry.find("atom:content", ns).text
        
        sub_updates = parse_content(content)
        total_sub_updates += len(sub_updates)
        print(f"\nEntry {idx+1}: Date={title}, Link={link}")
        print(f"  Number of sub-updates: {len(sub_updates)}")
        for j, sub in enumerate(sub_updates):
            print(f"    Sub-update {j+1}: [{sub['type']}]")
            print(f"      Text: {sub['body_text'][:120]}...")
            
except Exception as e:
    import traceback
    traceback.print_exc()
