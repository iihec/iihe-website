"""Export every visible English text of the built site (_site) to an Excel sheet for Khmer translation.

Run after `npm run build`:
    uv run --with beautifulsoup4 --with openpyxl python tools/translation_export.py OUT.xlsx

Each row has a stable key (page-section-item), the English text, an empty Khmer column and a note.
A text that repeats (header, footer, buttons used on many pages) is listed only once, so the
returned sheet works as an English -> Khmer dictionary for building the /km/ version.
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

SITE = Path(__file__).resolve().parent.parent / "_site"

PAGES = [
    ("home", "Home page", "index.html"),
    ("about", "About page", "about/index.html"),
    ("business", "Programme page: Business Management", "programmes/business-management/index.html"),
    ("software", "Programme page: Software Engineering", "programmes/software-engineering/index.html"),
    ("fees", "Fees & Admissions page", "fees-and-admissions/index.html"),
    ("book", "Book a consultation page", "book-a-consultation/index.html"),
    ("thanks", "Thank-you page (after the form is sent)", "thank-you/index.html"),
    ("news", "News page (list of articles)", "news/index.html"),
    ("privacy", "Privacy policy page", "privacy/index.html"),
    ("404", "Page not found (error page)", "404.html"),
    ("post-pathway", "News article: How the UK Degree Pathway Works in Cambodia", "news/how-the-uk-degree-pathway-works-in-cambodia/index.html"),
    ("post-bac2", "News article: What to Study After BAC II", "news/what-to-study-after-bac-ii/index.html"),
    ("post-choose", "News article: Business or Software Engineering", "news/business-or-software-engineering/index.html"),
]

# Text-level elements: one translatable unit unless they contain further structure.
TEXT_LEVEL = {
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "dt", "dd", "label", "button", "a",
    "option", "summary", "figcaption", "blockquote", "span", "strong", "em", "small", "legend", "caption",
}
STRUCTURE = {
    "div", "section", "article", "aside", "header", "footer", "nav", "main", "form", "fieldset",
    "ul", "ol", "dl", "table", "thead", "tbody", "tfoot", "tr", "p", "li", "td", "th", "dt", "dd",
    "h1", "h2", "h3", "h4", "h5", "h6", "label", "button", "figure", "figcaption", "blockquote",
    "select", "option", "small", "details", "summary",
}
SKIP = {"script", "style", "noscript", "svg", "template", "input", "textarea", "img", "br"}
ATTRS = [
    ("alt", "Image description (read by screen readers and Google)"),
    ("placeholder", "Grey hint text inside a form field"),
    ("aria-label", "Hidden label read by screen readers"),
    ("title", "Tooltip shown when hovering"),
    ("data-required", "Form error: field left empty"),
    ("data-invalid", "Form error: wrong format"),
]
NOT_TEXT = re.compile(r"^(?:[\W\d_]+|EN|KH|\S+@\S+|https?://\S+|\+?[\d ()-]{7,}|US\$[\d,]+)$")


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def is_text(text):
    return bool(text) and re.search(r"[A-Za-z]", text) and not NOT_TEXT.match(text)


def note_for(el):
    name = el.name
    cls = " ".join(el.get("class", []))
    if name in ("h1", "h2", "h3", "h4"):
        return "Heading"
    if name == "button" or "btn" in cls:
        return "Button"
    if name == "a":
        return "Link"
    if name == "label":
        return "Form field name"
    if name == "option":
        return "Choice in a drop-down list"
    if name in ("th", "td"):
        return "Table cell"
    if "eyebrow" in cls or "kicker" in cls:
        return "Small label above a heading (shown in capitals)"
    return ""


class Collector:
    def __init__(self):
        self.seen = {}
        self.rows = []  # (kind, key, english, note)

    def section(self, title):
        if self.rows and self.rows[-1][0] == "section":
            self.rows.pop()  # previous section had nothing new to translate
        self.rows.append(("section", "", title, ""))
        self.n = 0

    def add(self, prefix, text, note=""):
        text = clean(text)
        if not is_text(text):
            return
        if text in self.seen:
            return
        self.n += 1
        key = f"{prefix}-{self.n:03d}"
        self.seen[text] = key
        self.rows.append(("row", key, text, note))

    def walk(self, el, prefix):
        if isinstance(el, NavigableString):
            if el.parent.name not in SKIP:
                self.add(prefix, str(el))
            return
        if not isinstance(el, Tag) or el.name in SKIP:
            self.attrs(el, prefix)
            return
        if el.get("class") and "hp" in el.get("class"):
            return  # hidden anti-spam field
        self.attrs(el, prefix)
        if el.name in TEXT_LEVEL and not el.find(lambda t: t.name in STRUCTURE):
            self.add(prefix, re.sub(r"\s+([.,;:!?])", r"\1", el.get_text(" ")), note_for(el))
            for d in el.find_all(True):
                self.attrs(d, prefix)
            return
        for child in el.children:
            self.walk(child, prefix)

    def attrs(self, el, prefix):
        if not isinstance(el, Tag):
            return
        for attr, note in ATTRS:
            if el.get(attr):
                self.add(prefix, el[attr], note)


def section_name(sec):
    for sel in (".eyebrow", "h1", "h2", "h3"):
        found = sec.select_one(sel)
        if found and clean(found.get_text(" ")):
            return clean(found.get_text(" "))
    return sec.get("aria-label") or "Section"


def main(out):
    c = Collector()
    home = BeautifulSoup((SITE / "index.html").read_text(), "html.parser")
    shared = [
        ("shared-top", "EVERY PAGE: top bar, logo and menu", home.select(".utility-bar, .site-header")),
        ("shared-msg", "EVERY PAGE: 'Message admissions' panel and phone buttons", home.select(".msg-panel, .msg-fab, .mobile-actions")),
        ("shared-footer", "EVERY PAGE: footer", home.select(".site-footer")),
    ]
    for prefix, title, els in shared:
        c.section(title)
        for el in els:
            c.walk(el, prefix)

    # Shared texts that the home page does not show: the keyboard skip link and the default footer heading.
    about = BeautifulSoup((SITE / "about/index.html").read_text(), "html.parser")
    extra = about.select(".skip-link, .cta-band, .site-footer")
    c.section("EVERY PAGE: texts not on the home page")
    for el in extra:
        c.walk(el, "shared-more")

    for slug, title, path in PAGES:
        soup = BeautifulSoup((SITE / path).read_text(), "html.parser")
        for el in soup.select(".utility-bar, .site-header, .msg-panel, .msg-fab, .mobile-actions, .site-footer"):
            el.decompose()
        c.section(f"{title.upper()}: title and description in Google search results")
        c.add(slug, soup.title.get_text() if soup.title else "", "Browser tab and Google result title")
        desc = soup.find("meta", attrs={"name": "description"})
        if desc:
            c.add(slug, desc.get("content", ""), "Google result description")
        main_el = soup.find("main") or soup.body
        blocks = main_el.find_all(["section", "article"], recursive=False) or [main_el]
        for i, sec in enumerate(blocks, 1):
            c.section(f"{title.upper()}: {section_name(sec)}")
            c.walk(sec, f"{slug}-s{i:02d}")

    wb = Workbook()
    info = wb.active
    info.title = "Read me"
    lines = [
        "IIHE Cambodia website: English to Khmer translation",
        "",
        "How to fill in this file",
        "1. Open the 'Translation' sheet. Write the Khmer text in column C, on the same row as the English.",
        "2. Do not change columns A (Key) or B (English). We use them to put each translation in the right place.",
        "3. Grey rows are section titles. They tell you where the text appears on the website; they do not need translating.",
        "4. Each text appears only once, even if it is used on several pages (for example buttons and the footer).",
        "5. Column D explains special texts: buttons, headings, form messages, and texts only Google or screen readers see.",
        "6. Keep these names in English (they are official names): IIHE, NCC Education, University of Greater Manchester, "
        "Western International College Online (WINC), IT Academy STEP, MoEYS, IELTS, BAC II, A Levels, IB.",
        "7. Keep amounts, numbers, emails and links as they are.",
        "8. If a sentence has no good Khmer equivalent, write your suggestion and add a comment in column E.",
        "9. Use plain, friendly Khmer suitable for students aged 17 to 20 and their parents.",
    ]
    if c.rows and c.rows[-1][0] == "section":
        c.rows.pop()
    for i, line in enumerate(lines, 1):
        cell = info.cell(row=i, column=1, value=line)
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        if i in (1, 3):
            cell.font = Font(bold=True, size=14 if i == 1 else 12)
    info.column_dimensions["A"].width = 120

    ws = wb.create_sheet("Translation")
    head = ["Key (do not change)", "English", "Khmer", "Note for translator", "Translator comment"]
    ws.append(head)
    for col in range(1, 6):
        cell = ws.cell(row=1, column=col)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="D72027")
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    grey = PatternFill("solid", fgColor="E6E7E8")
    key_font = Font(color="808080", size=9)
    for kind, key, text, note in c.rows:
        ws.append([key, text, "", note, ""])
        r = ws.max_row
        for col in range(1, 6):
            ws.cell(row=r, column=col).alignment = Alignment(wrap_text=True, vertical="top")
        if kind == "section":
            for col in range(1, 6):
                ws.cell(row=r, column=col).fill = grey
            ws.cell(row=r, column=2).font = Font(bold=True)
        else:
            ws.cell(row=r, column=1).font = key_font
            ws.cell(row=r, column=4).font = Font(italic=True, color="808080", size=9)
    for col, width in zip("ABCDE", (16, 70, 70, 26, 30)):
        ws.column_dimensions[col].width = width
    ws.freeze_panes = "C2"
    wb.active = 1
    wb.save(out)
    n = sum(1 for k, *_ in c.rows if k == "row")
    words = sum(len(t.split()) for k, _, t, _ in c.rows if k == "row")
    print(f"{n} texts, about {words} English words -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
