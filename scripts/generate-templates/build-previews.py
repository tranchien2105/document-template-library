#!/usr/bin/env python3
"""Build text/layout preview metadata directly from the bundled OOXML files."""

import json
import os
import posixpath
import re
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
STORAGE = os.path.join(ROOT, "storage", "templates")
NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def word_text(element):
    parts = []
    for child in element.iter():
        if child.tag == "{%s}t" % NS["w"]:
            parts.append(child.text or "")
        elif child.tag == "{%s}tab" % NS["w"]:
            parts.append("    ")
        elif child.tag == "{%s}br" % NS["w"]:
            parts.append("\n")
    return "".join(parts).strip()


def docx_runs(paragraph):
    runs = []
    for run in paragraph.findall(".//w:r", NS):
        text = word_text(run)
        if not text:
            continue
        properties = run.find("w:rPr", NS)
        style = {}
        if properties is not None:
            bold = properties.find("w:b", NS)
            italic = properties.find("w:i", NS)
            if bold is not None and bold.get("{%s}val" % NS["w"], "1") not in ("0", "false", "off"):
                style["fontWeight"] = 700
            if italic is not None and italic.get("{%s}val" % NS["w"], "1") not in ("0", "false", "off"):
                style["fontStyle"] = "italic"
            if properties.find("w:u", NS) is not None:
                style["textDecoration"] = "underline"
            color = properties.find("w:color", NS)
            if color is not None and color.get("{%s}val" % NS["w"]):
                style["color"] = "#" + color.get("{%s}val" % NS["w"])
            size = properties.find("w:sz", NS)
            if size is not None and size.get("{%s}val" % NS["w"]):
                style["fontSize"] = int(size.get("{%s}val" % NS["w"])) / 2
            fonts = properties.find("w:rFonts", NS)
            if fonts is not None:
                font = fonts.get("{%s}ascii" % NS["w"]) or fonts.get("{%s}hAnsi" % NS["w"])
                if font:
                    style["fontFamily"] = font
        runs.append({"text": text, "style": style})
    return runs


def docx_preview(archive):
    root = ET.fromstring(archive.read("word/document.xml"))
    body = root.find("w:body", NS)
    blocks = []
    if body is None:
        return blocks

    for element in list(body):
        if element.tag == "{%s}p" % NS["w"]:
            text = word_text(element)
            if not text:
                continue
            style = element.find("w:pPr/w:pStyle", NS)
            style_name = style.get("{%s}val" % NS["w"], "") if style is not None else ""
            numbered = element.find("w:pPr/w:numPr", NS) is not None
            if style_name.lower() == "title":
                role = "title"
            elif "heading1" in style_name.lower():
                role = "heading"
            elif "heading2" in style_name.lower():
                role = "subheading"
            elif numbered:
                role = "bullet"
            elif text.startswith("THƯ VIỆN MẪU TÀI LIỆU"):
                role = "eyebrow"
            else:
                role = "paragraph"
            block = {"type": "paragraph", "role": role, "text": text}
            rich_runs = docx_runs(element)
            if rich_runs:
                block["runs"] = rich_runs
            blocks.append(block)
        elif element.tag == "{%s}tbl" % NS["w"]:
            rows = []
            for row in element.findall("w:tr", NS):
                rows.append([
                    " ".join(filter(None, (word_text(p) for p in cell.findall("w:p", NS))))
                    for cell in row.findall("w:tc", NS)
                ])
            if rows:
                blocks.append({"type": "table", "rows": rows})
    return blocks


def color_from(element, default=None):
    if element is None:
        return default
    color = element.find("a:srgbClr", NS)
    if color is not None:
        return "#" + color.get("val", "FFFFFF")
    scheme = element.find("a:schemeClr", NS)
    if scheme is not None:
        names = {
            "accent1": "#F45100", "accent2": "#333333", "dk1": "#0A0A0A",
            "lt1": "#FFFFFF", "dk2": "#333333", "lt2": "#F7F7F7",
        }
        return names.get(scheme.get("val"), default)
    return default


def shape_text(shape):
    text_body = shape.find("p:txBody", NS)
    if text_body is None:
        return "", {}
    paragraphs = []
    for paragraph in text_body.findall("a:p", NS):
        paragraphs.append("".join(node.text or "" for node in paragraph.findall(".//a:t", NS)))
    text = "\n".join(paragraphs).strip()
    run_style = text_body.find(".//a:rPr", NS)
    if run_style is None:
        run_style = text_body.find(".//a:defRPr", NS)
    style = {}
    if run_style is not None:
        if run_style.get("sz"):
            style["fontSize"] = int(run_style.get("sz")) / 100
        style["bold"] = run_style.get("b") == "1"
        style["color"] = color_from(run_style.find("a:solidFill", NS))
        latin = run_style.find("a:latin", NS)
        if latin is not None and latin.get("typeface"):
            style["fontFace"] = latin.get("typeface")
    first_paragraph = text_body.find("a:p", NS)
    p_properties = first_paragraph.find("a:pPr", NS) if first_paragraph is not None else None
    if p_properties is not None:
        style["align"] = {"ctr": "center", "r": "right", "just": "justify"}.get(p_properties.get("algn"), "left")
    body_properties = text_body.find("a:bodyPr", NS)
    if body_properties is not None:
        style["verticalAlign"] = {"ctr": "middle", "b": "bottom"}.get(body_properties.get("anchor"), "top")
    return text, style


def pptx_preview(archive):
    presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
    rels = ET.fromstring(archive.read("ppt/_rels/presentation.xml.rels"))
    targets = {rel.get("Id"): rel.get("Target") for rel in rels.findall("rel:Relationship", NS)}
    size = presentation.find("p:sldSz", NS)
    width = int(size.get("cx", 12192000)) / 914400 if size is not None else 13.333
    height = int(size.get("cy", 6858000)) / 914400 if size is not None else 7.5
    slides = []

    for slide_id in presentation.findall("p:sldIdLst/p:sldId", NS):
        target = targets.get(slide_id.get("{%s}id" % NS["r"]))
        if not target:
            continue
        slide_path = posixpath.normpath(posixpath.join("ppt", target))
        slide = ET.fromstring(archive.read(slide_path))
        background = slide.find("p:cSld/p:bg/p:bgPr/a:solidFill", NS)
        current_slide = {
            "background": color_from(background, "#FFFFFF"),
            "widthInches": width,
            "heightInches": height,
            "shapes": [],
        }
        tree = slide.find("p:cSld/p:spTree", NS)
        if tree is not None:
            for shape in tree.findall("p:sp", NS) + tree.findall("p:cxnSp", NS):
                transform = shape.find("p:spPr/a:xfrm", NS)
                if transform is None:
                    continue
                offset = transform.find("a:off", NS)
                extent = transform.find("a:ext", NS)
                if offset is None or extent is None:
                    continue
                geometry = shape.find("p:spPr/a:prstGeom", NS)
                geometry_name = geometry.get("prst", "rect") if geometry is not None else ("line" if shape.tag.endswith("cxnSp") else "rect")
                fill = shape.find("p:spPr/a:solidFill", NS)
                line = shape.find("p:spPr/a:ln/a:solidFill", NS)
                text, text_style = shape_text(shape)
                current_slide["shapes"].append({
                    "x": int(offset.get("x", 0)) / 914400,
                    "y": int(offset.get("y", 0)) / 914400,
                    "width": int(extent.get("cx", 0)) / 914400,
                    "height": int(extent.get("cy", 0)) / 914400,
                    "geometry": geometry_name,
                    "fill": color_from(fill),
                    "line": color_from(line),
                    "text": text,
                    "textStyle": text_style,
                })
        slides.append(current_slide)
    return {"kind": "pptx-layout", "slides": slides}


def recolor_office(path):
    replacements = {
        b"17324D": b"0A0A0A", b"245B86": b"0A0A0A", b"2D8C88": b"F45100",
        b"EAF1F5": b"F7F7F7", b"263746": b"222222", b"687987": b"555555",
        b"D5DEE5": b"DEDEDE", b"B47B40": b"F45100", b"D7E4EC": b"E5E5E5",
        b"C0D0DC": b"D6D6D6", b"91C9C5": b"F45100", b"9DB3C1": b"B7B7B7",
        b"D9E2E9": b"DEDEDE", b"E2E8ED": b"B7B7B7", b"EFF4F7": b"F7F7F7",
        b"81919D": b"555555", b"F7F9FB": b"F7F7F7",
    }
    folder = os.path.dirname(path)
    fd, temporary = tempfile.mkstemp(prefix="papertrail-format-", suffix=".zip", dir=folder)
    os.close(fd)
    try:
        with zipfile.ZipFile(path, "r") as source, zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as output:
            for entry in source.infolist():
                payload = source.read(entry.filename)
                if entry.filename.endswith(".xml"):
                    for old, new in replacements.items():
                        payload = payload.replace(old, new)
                output.writestr(entry, payload)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    manifest_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(STORAGE, "manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as file:
        manifest = json.load(file)

    for template in manifest.get("templates", []):
        relative = template.get("filePath", "")
        file_path = os.path.realpath(os.path.join(STORAGE, relative))
        if os.path.commonpath([os.path.realpath(STORAGE), file_path]) != os.path.realpath(STORAGE):
            raise ValueError("Đường dẫn template nằm ngoài thư mục lưu trữ.")
        recolor_office(file_path)
        with zipfile.ZipFile(file_path, "r") as office:
            if template["type"] == "document":
                render_preview = {"kind": "docx-content", "blocks": docx_preview(office)}
            else:
                render_preview = pptx_preview(office)
        template.setdefault("preview", {})["renderPreview"] = render_preview
        template.pop("renderPreview", None)

    with open(manifest_path, "w", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print("Đã đồng bộ preview từ nội dung Office và áp dụng bảng màu Papertrail cho 8 mẫu.")


if __name__ == "__main__":
    main()
