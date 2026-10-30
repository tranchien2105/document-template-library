#!/usr/bin/env python3
"""Validate generated DOCX/PPTX ZIP packages and their OOXML relationships."""

import argparse
import posixpath
import shutil
import subprocess
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS = {"w": W_NS}


class ValidationError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def source_for_rels(rels_name):
    if rels_name == "_rels/.rels":
        return ""
    directory, basename = posixpath.split(rels_name)
    require(posixpath.basename(directory) == "_rels" and basename.endswith(".rels"),
            f"Đường dẫn relationships không hợp lệ: {rels_name}")
    source_dir = posixpath.dirname(posixpath.dirname(rels_name))
    source_name = basename[:-5]
    return posixpath.join(source_dir, source_name) if source_dir else source_name


def validate_package(path, template):
    require(path.is_file(), f"Không tìm thấy file: {path}")
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        name_set = set(names)
        require(len(names) == len(name_set), "Gói ZIP có tên thành phần trùng lặp")
        bad_member = archive.testzip()
        require(bad_member is None, f"CRC không hợp lệ: {bad_member}")
        require("[Content_Types].xml" in name_set, "Thiếu [Content_Types].xml")
        require("_rels/.rels" in name_set, "Thiếu _rels/.rels")

        parsed = {}
        for name in names:
            if name.endswith(".xml") or name.endswith(".rels"):
                try:
                    parsed[name] = ET.fromstring(archive.read(name))
                except ET.ParseError as exc:
                    raise ValidationError(f"XML không hợp lệ tại {name}: {exc}") from exc

        content_types = parsed["[Content_Types].xml"]
        defaults, overrides = {}, {}
        for node in content_types.findall(f"{{{CT_NS}}}Default"):
            ext = node.attrib.get("Extension", "").lower()
            require(ext and ext not in defaults, f"Content type Default trùng/thiếu Extension: {ext}")
            defaults[ext] = node.attrib.get("ContentType")
        for node in content_types.findall(f"{{{CT_NS}}}Override"):
            part = node.attrib.get("PartName", "").lstrip("/")
            require(part and part not in overrides, f"Content type Override trùng/thiếu PartName: {part}")
            overrides[part] = node.attrib.get("ContentType")
        for name in names:
            if name.endswith("/") or name == "[Content_Types].xml" or name.endswith(".rels"):
                continue
            extension = name.rsplit(".", 1)[-1].lower() if "." in name else ""
            require(name in overrides or extension in defaults,
                    f"Thiếu content type cho thành phần {name}")

        rels_by_source = {}
        for rels_name, root in parsed.items():
            if not rels_name.endswith(".rels"):
                continue
            source = source_for_rels(rels_name)
            ids = {}
            for rel in root.findall(f"{{{REL_NS}}}Relationship"):
                rid = rel.attrib.get("Id")
                target = rel.attrib.get("Target")
                require(rid and rid not in ids, f"Relationship ID thiếu/trùng trong {rels_name}: {rid}")
                require(target, f"Relationship {rid} không có Target trong {rels_name}")
                ids[rid] = rel
                if rel.attrib.get("TargetMode") == "External":
                    continue
                if target.startswith("/"):
                    resolved = target.lstrip("/")
                else:
                    resolved = posixpath.normpath(posixpath.join(posixpath.dirname(source), target))
                require(not resolved.startswith("../") and resolved in name_set,
                        f"Relationship {rels_name}#{rid} trỏ tới thành phần không tồn tại: {target}")
            rels_by_source[source] = ids

        root_rels = rels_by_source.get("", {})
        office_rels = [rel for rel in root_rels.values()
                       if rel.attrib.get("Type", "").endswith("/officeDocument")]
        require(len(office_rels) == 1, "Phải có đúng một root officeDocument relationship")
        main_target = office_rels[0].attrib["Target"].lstrip("/")
        expected_main = "word/document.xml" if template["type"] == "document" else "ppt/presentation.xml"
        require(main_target == expected_main, f"Main document sai: {main_target}")
        expected_content_type = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
            if template["type"] == "document"
            else "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"
        )
        require(overrides.get(expected_main) == expected_content_type,
                f"Main part thiếu/sai content type: {expected_main}")

        for xml_name, root in parsed.items():
            if not xml_name.endswith(".xml") or xml_name == "[Content_Types].xml":
                continue
            rel_ids = rels_by_source.get(xml_name, {})
            for element in root.iter():
                for attr_name, value in element.attrib.items():
                    if attr_name.startswith(f"{{{R_NS}}}"):
                        require(value in rel_ids,
                                f"Relationship reference không tồn tại: {xml_name} @{attr_name}={value}")

        if template["type"] == "document":
            document = parsed.get("word/document.xml")
            numbering = parsed.get("word/numbering.xml")
            require(document is not None and numbering is not None, "DOCX thiếu document.xml hoặc numbering.xml")
            num_ids = {node.attrib.get(f"{{{W_NS}}}numId") for node in numbering.findall("w:num", NS)}
            abstract_ids = {node.attrib.get(f"{{{W_NS}}}abstractNumId") for node in numbering.findall("w:abstractNum", NS)}
            for ilvl in document.findall(".//w:ilvl", NS):
                value = ilvl.attrib.get(f"{{{W_NS}}}val")
                require(value is not None, "w:ilvl thiếu thuộc tính bắt buộc w:val (cấu trúc danh sách không hợp lệ)")
                require(value.isdigit() and 0 <= int(value) <= 8, f"w:ilvl ngoài phạm vi: {value}")
            for num_id in document.findall(".//w:numId", NS):
                value = num_id.attrib.get(f"{{{W_NS}}}val")
                require(value is not None and value in num_ids, f"w:numId thiếu hoặc không có trong numbering.xml: {value}")
            for num in numbering.findall("w:num", NS):
                abstract = num.find("w:abstractNumId", NS)
                value = abstract.attrib.get(f"{{{W_NS}}}val") if abstract is not None else None
                require(value is not None and value in abstract_ids, f"w:num tham chiếu abstractNum không tồn tại: {value}")

        if template["type"] == "presentation":
            slide_names = [name for name in names if __import__("re").fullmatch(r"ppt/slides/slide\d+\.xml", name)]
            expected_count = template.get("preview", {}).get("slideCount")
            require(expected_count is not None and len(slide_names) == expected_count,
                    f"Số slide không khớp: có {len(slide_names)}, metadata ghi {expected_count}")
            preview = template.get("preview", {})
            fields = preview.get("fields", [])
            field_keys = {field.get("key") for field in fields}
            require(len(field_keys) == len(fields) and None not in field_keys,
                    "Danh sách trường PowerPoint bị trùng hoặc thiếu key")
            discovered = set()
            for slide_name in slide_names:
                slide_text = "".join(node.text or "" for node in parsed[slide_name].iter(f"{{{A_NS}}}t"))
                discovered.update(__import__("re").findall(r"\{\{([a-zA-Z0-9_]+)\}\}", slide_text))
            require(discovered == field_keys,
                    f"Trường metadata không khớp placeholder trong slide: thiếu={sorted(discovered - field_keys)}, thừa={sorted(field_keys - discovered)}")
            slide_fields = preview.get("slideFields", [])
            require(len(slide_fields) == len(slide_names), "Metadata trường theo slide không khớp số slide")
            require(all(set(keys).issubset(field_keys) for keys in slide_fields),
                    "Metadata slide tham chiếu trường không tồn tại")
    return len(names)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()
    manifest_path = Path(args.manifest).resolve()
    root = manifest_path.parent.parent.parent
    import json
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    templates = manifest.get("templates")
    require(isinstance(templates, list) and len(templates) == 8, "Manifest phải có đủ 8 template")
    successes = 0
    failures = 0
    for template in templates:
        try:
            relative = Path(template["filePath"])
            require(not relative.is_absolute() and ".." not in relative.parts, "Đường dẫn template không hợp lệ")
            member_count = validate_package(root / "storage" / "templates" / relative, template)
            print(f"OOXML HỢP LỆ  {template['slug']} ({member_count} thành phần)")
            successes += 1
        except Exception as exc:  # collect every template failure
            print(f"OOXML LỖI      {template.get('slug', '<không rõ>')}: {exc}", file=sys.stderr)
            failures += 1

    office = shutil.which("libreoffice") or shutil.which("soffice")
    if office and failures == 0:
        with tempfile.TemporaryDirectory(prefix="office-validation-") as tmp:
            for template in templates:
                path = root / "storage" / "templates" / template["filePath"]
                result = subprocess.run([office, "--headless", "--convert-to", "pdf", "--outdir", tmp, str(path)],
                                        capture_output=True, text=True, timeout=90)
                expected_pdf = Path(tmp) / f"{path.stem}.pdf"
                if result.returncode == 0 and expected_pdf.is_file() and expected_pdf.stat().st_size:
                    print(f"LIBREOFFICE OK {template['slug']}")
                else:
                    failures += 1
                    print(f"LIBREOFFICE LỖI {template['slug']}: {result.stderr.strip() or result.stdout.strip()}", file=sys.stderr)
    else:
        print("LibreOffice không có trong môi trường; chưa thể kiểm tra bằng renderer độc lập.")

    print(f"Kết quả: {successes}/8 gói OOXML đạt cấu trúc; {failures} lỗi.")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValidationError, OSError, ValueError, KeyError) as exc:
        print(f"Không thể hoàn tất kiểm tra: {exc}", file=sys.stderr)
        sys.exit(1)
