"""Build a self-contained review copy of the site in preview/ for sharing as a private link.

- rewrites root-relative links ("/about/") to relative file links ("../about/index.html")
- adds a small "Preview" notice and turns the consultation form into a demo (it cannot send from a preview)
- leaves out the content editor (/admin) and the 404 page

Run from the project folder after building the site:
  npm run build && python3 tools/make_preview.py
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "_site"
OUT = ROOT / "preview"

NOTICE = (
    '<div style="background:#202124;color:#fff;font:600 13px/1.4 Archivo,Arial,sans-serif;'
    'padding:10px max(16px,env(safe-area-inset-left,0px));text-align:center">'
    'Website preview for review. Not yet live. The consultation form is a demo and does not send.</div>'
)
FORM_DEMO = """<script>
document.addEventListener('submit', function (e) {
  if (e.defaultPrevented) return;
  e.preventDefault();
  location.href = '%sthank-you/index.html';
});
</script>"""


def rel_url(url, depth):
    """Turn '/x/y/' or '/x/#a' into a relative link from a page `depth` folders deep."""
    prefix = "../" * depth
    path, _, frag = url[1:].partition("#")
    path, _, _query = path.partition("?")
    if path == "" or path.endswith("/"):
        path = path + "index.html"
    out = prefix + path
    return out + ("#" + frag if frag else "")


def rewrite(html, depth):
    def attr(m):
        name, quote, val = m.group(1), m.group(2), m.group(3)
        if val.startswith("//") or not val.startswith("/"):
            return m.group(0)
        return f"{name}={quote}{rel_url(val, depth)}{quote}"

    html = re.sub(r'\b(href|src|action)=(["\'])(/[^"\']*)\2', attr, html)

    def srcset(m):
        parts = []
        for item in m.group(1).split(","):
            bits = item.strip().split()
            if bits and bits[0].startswith("/"):
                bits[0] = rel_url(bits[0], depth)
            parts.append(" ".join(bits))
        return f'srcset="{", ".join(parts)}"'

    html = re.sub(r'srcset="([^"]*)"', srcset, html)
    html = html.replace("<body", "<body", 1)
    html = re.sub(r"(<body[^>]*>)", r"\1" + NOTICE, html, count=1)
    html = html.replace("</body>", (FORM_DEMO % ("../" * depth)) + "</body>", 1)
    return html


def strip_skeleton(html):
    """The main page is wrapped in its own document skeleton at publish time."""
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    head = re.sub(r'<meta charset="utf-8">\s*', "", head)
    head = re.sub(r'<meta name="viewport"[^>]*>\s*', "", head)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    return head.strip() + "\n" + body.strip() + "\n"


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SITE / "assets", OUT / "assets")
    shutil.copy(SITE / "favicon.svg", OUT / "favicon.svg")
    for page in SITE.rglob("*.html"):
        rel = page.relative_to(SITE)
        if rel.parts[0] == "admin" or rel.name == "404.html":
            continue
        depth = len(rel.parts) - 1
        html = rewrite(page.read_text(), depth)
        if rel == Path("index.html"):
            html = strip_skeleton(html)
            html = re.sub(r"<title>.*?</title>", "<title>IIHE Cambodia Website</title>", html, count=1)
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(html)
    files = sorted(str(p.relative_to(OUT)) for p in OUT.rglob("*") if p.is_file())
    print(len(files), "files")
    for f in files:
        print(f)


if __name__ == "__main__":
    main()
