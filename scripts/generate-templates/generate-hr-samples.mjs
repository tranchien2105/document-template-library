import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import pptxgen from 'pptxgenjs';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'storage/template-upload-samples/hr');
const documents = path.join(output, 'documents');
const presentations = path.join(output, 'presentations');
const thumbnails = path.join(output, 'thumbnails');

const palette = {
  orange: 'F45100',
  orangeDark: 'D84300',
  ink: '111111',
  slate: '343434',
  gray: '666666',
  muted: '8A8A8A',
  line: 'D9D9D9',
  paper: 'FFFFFF',
  soft: 'F5F5F5',
  blush: 'FFF0E9',
  green: '27745B',
  paleGreen: 'EAF4EF',
};

const vi = (text, options = {}) => new TextRun({
  text,
  font: 'Aptos',
  language: { value: 'vi-VN', eastAsia: 'vi-VN' },
  ...options,
});

const p = (text, options = {}) => new Paragraph({
  children: Array.isArray(text) ? text : [vi(text)],
  spacing: { after: 100, line: 276, ...options.spacing },
  ...options,
});

const h1 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 310, after: 120 },
  keepNext: true,
});

const h2 = (text) => new Paragraph({
  children: [vi(text, { bold: true, color: palette.orangeDark, size: 23 })],
  spacing: { before: 200, after: 75 },
  keepNext: true,
});

const bullet = (text) => new Paragraph({
  children: [vi(text)],
  bullet: { level: 0 },
  indent: { left: 360, hanging: 180 },
  spacing: { after: 75 },
});

function tableCell(value, { header = false, width = 25, shade = false } = {}) {
  const contents = Array.isArray(value) ? value : [vi(value, { bold: header, color: header ? palette.paper : palette.ink, size: 19 })];
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: contents, spacing: { before: 35, after: 35, line: 240 } })],
    shading: header
      ? { type: ShadingType.CLEAR, fill: palette.ink }
      : shade ? { type: ShadingType.CLEAR, fill: palette.soft } : undefined,
    margins: { top: 95, bottom: 95, left: 110, right: 110 },
    verticalAlign: 'center',
  });
}

function table(headers, rows, widths = headers.map(() => 100 / headers.length)) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths.map((width) => Math.round(width * 90)),
    rows: [
      new TableRow({ children: headers.map((label, index) => tableCell(label, { header: true, width: widths[index] })), tableHeader: true }),
      ...rows.map((row, rowIndex) => new TableRow({
        cantSplit: true,
        children: row.map((value, index) => tableCell(value, { width: widths[index], shade: rowIndex % 2 === 1 })),
      })),
    ],
    borders: Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].map((side) => [side, {
      style: BorderStyle.SINGLE,
      size: side === 'top' || side === 'bottom' ? 8 : 4,
      color: side === 'top' ? palette.orange : palette.line,
    }])),
  });
}

function cover(title, kicker, subtitle) {
  return [
    p('PAPERTRAIL  /  BỘ CÔNG CỤ NHÂN SỰ', {
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: palette.orange, space: 8 } },
      spacing: { after: 250 },
      children: [vi('PAPERTRAIL', { bold: true, color: palette.orange, size: 18, characterSpacing: 25 }), vi('   /   BỘ CÔNG CỤ NHÂN SỰ', { bold: true, color: palette.gray, size: 16, characterSpacing: 15 })],
    }),
    p(kicker.toLocaleUpperCase('vi-VN'), { spacing: { before: 220, after: 75 }, children: [vi(kicker.toLocaleUpperCase('vi-VN'), { bold: true, color: palette.orange, size: 18, characterSpacing: 24 })] }),
    new Paragraph({
      children: [vi(title, { font: 'Aptos Display', bold: true, size: 42, color: palette.ink })],
      spacing: { after: 100, line: 500 },
      keepNext: true,
    }),
    p(subtitle, { spacing: { after: 240 }, children: [vi(subtitle, { color: palette.gray, size: 22 })] }),
    p([vi('ĐƠN VỊ  ', { bold: true, color: palette.gray, size: 17 }), vi('{{ten_cong_ty}}', { bold: true, color: palette.ink, size: 19 })], { spacing: { after: 60 } }),
    p([vi('PHIÊN BẢN  ', { bold: true, color: palette.gray, size: 17 }), vi('{{phien_ban_tai_lieu}}', { color: palette.ink, size: 19 })], { spacing: { after: 240 } }),
  ];
}

function makeDocx({ title, description, children }) {
  return new Document({
    creator: 'Papertrail — Bộ mẫu Nhân sự',
    title,
    description,
    subject: 'Biểu mẫu nhân sự có trường nội dung thay thế',
    styles: {
      default: {
        document: { run: { font: 'Aptos', size: 21, color: palette.ink, language: { value: 'vi-VN', eastAsia: 'vi-VN' } }, paragraph: { spacing: { after: 90 } } },
        heading1: { run: { font: 'Aptos Display', size: 31, bold: true, color: palette.ink, language: { value: 'vi-VN', eastAsia: 'vi-VN' } }, paragraph: { spacing: { before: 300, after: 110 } } },
      },
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 950, right: 1050, bottom: 950, left: 1050 } } },
      headers: { default: new Header({ children: [p('PAPERTRAIL  •  TÀI LIỆU NỘI BỘ', { alignment: AlignmentType.RIGHT, children: [vi('PAPERTRAIL  •  TÀI LIỆU NỘI BỘ', { bold: true, color: palette.muted, size: 15 })] })] }) },
      footers: { default: new Footer({ children: [p('Tài liệu mẫu — vui lòng cập nhật thông tin trước khi sử dụng', { alignment: AlignmentType.CENTER, children: [vi('Tài liệu mẫu — vui lòng cập nhật thông tin trước khi sử dụng', { color: palette.muted, size: 15 })] })] }) },
      children,
    }],
  });
}

const recruitmentPlan = makeDocx({
  title: 'KẾ HOẠCH TUYỂN DỤNG',
  description: 'Kế hoạch tuyển dụng theo quý với nhu cầu nhân lực, ngân sách, tiến độ và chỉ số theo dõi.',
  children: [
    ...cover('Kế hoạch tuyển dụng', 'Hoạch định nhân lực', 'Kế hoạch thu hút đúng người, đúng năng lực, đúng thời điểm.'),
    h1('01  /  Tóm tắt kế hoạch'),
    p('Tài liệu này thống nhất nhu cầu tuyển dụng giữa bộ phận Nhân sự và các trưởng đơn vị. Mỗi vị trí cần có người phụ trách, thời hạn và tiêu chí đánh giá rõ ràng.'),
    table(['Thông tin', 'Nội dung'], [
      ['Kỳ kế hoạch', '{{ky_ke_hoach}}'],
      ['Đầu mối Nhân sự', '{{dau_moi_nhan_su}}'],
      ['Người phê duyệt', '{{nguoi_phe_duyet}}'],
      ['Tổng chỉ tiêu', '{{tong_chi_tieu_tuyen_dung}} vị trí'],
    ], [34, 66]),
    h1('02  /  Nhu cầu tuyển dụng'),
    table(['Phòng ban / vị trí', 'Số lượng', 'Cấp độ', 'Hạn cần người', 'Quản lý phụ trách'], [
      ['{{phong_ban_1}} / {{vi_tri_1}}', '{{so_luong_1}}', '{{cap_do_1}}', '{{han_tuyen_1}}', '{{quan_ly_1}}'],
      ['{{phong_ban_2}} / {{vi_tri_2}}', '{{so_luong_2}}', '{{cap_do_2}}', '{{han_tuyen_2}}', '{{quan_ly_2}}'],
      ['{{phong_ban_3}} / {{vi_tri_3}}', '{{so_luong_3}}', '{{cap_do_3}}', '{{han_tuyen_3}}', '{{quan_ly_3}}'],
    ], [25, 12, 15, 20, 28]),
    h1('03  /  Tiêu chí và kênh thu hút'),
    h2('Hồ sơ ứng viên mục tiêu'),
    p('{{chan_dung_ung_vien}}'),
    h2('Kênh tuyển dụng ưu tiên'),
    bullet('Kênh nội bộ và chương trình giới thiệu nhân sự: {{kenh_noi_bo}}.'),
    bullet('Nền tảng tuyển dụng và mạng xã hội nghề nghiệp: {{kenh_tuyen_dung}}.'),
    bullet('Đối tác tuyển dụng hoặc trường đại học: {{kenh_doi_tac}}.'),
    h1('04  /  Lịch triển khai và ngân sách'),
    table(['Giai đoạn', 'Thời gian', 'Kết quả cần đạt', 'Người phụ trách'], [
      ['Tiếp nhận và duyệt yêu cầu', '{{thoi_gian_tiep_nhan}}', '{{ket_qua_tiep_nhan}}', '{{phu_trach_tiep_nhan}}'],
      ['Tìm kiếm và sàng lọc', '{{thoi_gian_sang_loc}}', '{{ket_qua_sang_loc}}', '{{phu_trach_sang_loc}}'],
      ['Phỏng vấn và đề nghị', '{{thoi_gian_phong_van}}', '{{ket_qua_phong_van}}', '{{phu_trach_phong_van}}'],
      ['Nhận việc và hội nhập', '{{thoi_gian_nhan_viec}}', '{{ket_qua_nhan_viec}}', '{{phu_trach_nhan_viec}}'],
    ], [22, 19, 36, 23]),
    p([vi('Ngân sách dự kiến: ', { bold: true }), vi('{{ngan_sach_tuyen_dung}}', { bold: true, color: palette.orangeDark })]),
    h1('05  /  Chỉ số theo dõi và rủi ro'),
    table(['Chỉ số', 'Mục tiêu', 'Cách theo dõi'], [
      ['Thời gian tuyển trung bình', '{{muc_tieu_thoi_gian_tuyen}}', 'Ngày mở yêu cầu đến ngày ứng viên nhận việc'],
      ['Tỷ lệ nhận đề nghị', '{{muc_tieu_ti_le_nhan_viec}}', 'Số đề nghị được chấp nhận / tổng đề nghị'],
      ['Tỷ lệ đạt thử việc', '{{muc_tieu_dat_thu_viec}}', 'Kết quả đánh giá sau thời gian thử việc'],
    ], [31, 22, 47]),
    p('Rủi ro chính và phương án xử lý: {{rui_ro_va_phuong_an}}'),
    h1('06  /  Xác nhận'),
    p('Kế hoạch được rà soát định kỳ và điều chỉnh khi nhu cầu kinh doanh thay đổi.'),
    table(['Đại diện Nhân sự', 'Trưởng đơn vị', 'Người phê duyệt'], [
      ['{{ky_ten_nhan_su}}\n{{ngay_ky_nhan_su}}', '{{ky_ten_truong_don_vi}}\n{{ngay_ky_truong_don_vi}}', '{{ky_ten_phe_duyet}}\n{{ngay_ky_phe_duyet}}'],
    ], [34, 33, 33]),
  ],
});

const interviewScorecard = makeDocx({
  title: 'PHIẾU ĐÁNH GIÁ PHỎNG VẤN',
  description: 'Biểu mẫu phỏng vấn có khung năng lực, thang điểm, nhận xét và đề xuất tuyển dụng.',
  children: [
    ...cover('Phiếu đánh giá phỏng vấn', 'Tuyển chọn công bằng', 'Ghi nhận bằng chứng nhất quán để ra quyết định tuyển dụng có cơ sở.'),
    h1('01  /  Thông tin buổi phỏng vấn'),
    table(['Thông tin', 'Chi tiết'], [
      ['Ứng viên', '{{ung_vien_ho_ten}}'],
      ['Vị trí ứng tuyển', '{{vi_tri_ung_tuyen}}'],
      ['Phòng ban', '{{phong_ban_tuyen_dung}}'],
      ['Người phỏng vấn', '{{nguoi_phong_van}}'],
      ['Ngày và vòng phỏng vấn', '{{ngay_phong_van}} / {{vong_phong_van}}'],
    ], [34, 66]),
    h1('02  /  Hướng dẫn chấm điểm'),
    p('Chấm theo thang 1–5 dựa trên câu trả lời và ví dụ cụ thể. Ghi chú bằng chứng quan sát được; tránh đánh giá dựa trên cảm tính hoặc đặc điểm không liên quan đến công việc.'),
    table(['Điểm', 'Mức độ thể hiện'], [
      ['1', 'Chưa đáp ứng; chưa đưa ra ví dụ phù hợp.'],
      ['2', 'Đáp ứng một phần; cần hướng dẫn đáng kể.'],
      ['3', 'Đáp ứng yêu cầu cơ bản của vị trí.'],
      ['4', 'Thể hiện tốt; ví dụ rõ và có kết quả.'],
      ['5', 'Nổi bật; tư duy sâu và tác động vượt mong đợi.'],
    ], [16, 84]),
    h1('03  /  Đánh giá năng lực'),
    table(['Năng lực', 'Trọng số', 'Điểm 1–5', 'Bằng chứng / nhận xét'], [
      ['Kiến thức chuyên môn', '{{trong_so_chuyen_mon}}%', '{{diem_chuyen_mon}}', '{{nhan_xet_chuyen_mon}}'],
      ['Giải quyết vấn đề', '{{trong_so_giai_quyet_van_de}}%', '{{diem_giai_quyet_van_de}}', '{{nhan_xet_giai_quyet_van_de}}'],
      ['Giao tiếp và phối hợp', '{{trong_so_giao_tiep}}%', '{{diem_giao_tiep}}', '{{nhan_xet_giao_tiep}}'],
      ['Mức độ phù hợp vai trò', '{{trong_so_phu_hop}}%', '{{diem_phu_hop}}', '{{nhan_xet_phu_hop}}'],
      ['Tổng điểm / kết luận', '100%', '{{tong_diem}}', '{{ket_luan_tong_quan}}'],
    ], [25, 15, 14, 46]),
    h1('04  /  Ghi nhận sau phỏng vấn'),
    h2('Điểm mạnh nổi bật'),
    p('{{diem_manh_ung_vien}}'),
    h2('Điểm cần xác minh hoặc phát triển'),
    p('{{diem_can_xac_minh}}'),
    h2('Kỳ vọng và mức độ sẵn sàng'),
    p('Thời gian có thể nhận việc: {{thoi_gian_nhan_viec}}. Mức lương kỳ vọng: {{muc_luong_ky_vong}}. Ghi chú khác: {{ghi_chu_khac}}.'),
    h1('05  /  Đề xuất của người phỏng vấn'),
    table(['Lựa chọn', 'Đánh dấu'], [
      ['☐  Mời vào vòng tiếp theo', '{{chon_vong_tiep_theo}}'],
      ['☐  Đề nghị tuyển dụng', '{{chon_de_nghi_tuyen_dung}}'],
      ['☐  Cân nhắc vị trí khác', '{{chon_vi_tri_khac}}'],
      ['☐  Không tiếp tục', '{{chon_khong_tiep_tuc}}'],
    ], [72, 28]),
    p([vi('Lý do và bước tiếp theo: ', { bold: true }), vi('{{ly_do_de_xuat}}')]),
    p([vi('Người đánh giá: ', { bold: true }), vi('{{nguoi_danh_gia}}'), vi('     Ngày hoàn tất: ', { bold: true }), vi('{{ngay_hoan_tat}}')]),
  ],
});

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(text, {
    x, y, w, h,
    margin: 0,
    breakLine: false,
    fontFace: 'Aptos',
    color: palette.ink,
    fontSize: 15,
    valign: 'mid',
    fit: 'shrink',
    ...options,
  });
}

function addBase(slide, index, section, accent = palette.orange) {
  slide.background = { color: palette.paper };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  addText(slide, 'PAPERTRAIL  /  NHÂN SỰ', 0.52, 0.28, 4.2, 0.24, { fontSize: 9, bold: true, charSpacing: 2.2, color: palette.gray });
  addText(slide, `${String(index).padStart(2, '0')}  /  06`, 11.6, 0.28, 1.1, 0.24, { fontSize: 9, color: palette.gray, align: 'right' });
  slide.addShape(pptx.ShapeType.line, { x: 0.52, y: 0.72, w: 12.25, h: 0, line: { color: palette.line, width: 1 } });
  slide.addShape(pptx.ShapeType.line, { x: 0.52, y: 7.08, w: 12.25, h: 0, line: { color: palette.line, width: 0.8 } });
  addText(slide, 'TÀI LIỆU LÀM VIỆC  •  CẬP NHẬT TRƯỚC KHI PHÁT HÀNH', 0.52, 7.18, 8.5, 0.16, { fontSize: 8, color: palette.muted });
  addText(slide, section, 9.4, 7.18, 3.35, 0.16, { fontSize: 8, color: palette.gray, align: 'right' });
}

function addTitle(slide, title, subtitle) {
  addText(slide, title, 0.65, 1.05, 11.9, 0.68, { fontFace: 'Aptos Display', fontSize: 30, bold: true, breakLine: false, valign: 'mid' });
  addText(slide, subtitle, 0.68, 1.82, 11.7, 0.4, { fontSize: 14, color: palette.gray, valign: 'top' });
}

function addCard(slide, x, y, w, h, label, value, detail, color = palette.orange) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, line: { color: palette.line, width: 0.8 }, fill: { color: palette.paper } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.06, h, line: { color, transparency: 100 }, fill: { color } });
  addText(slide, label.toLocaleUpperCase('vi-VN'), x + 0.2, y + 0.17, w - 0.38, 0.24, { fontSize: 9, bold: true, color: palette.gray, charSpacing: 1.1 });
  addText(slide, value, x + 0.2, y + 0.52, w - 0.38, 0.54, { fontSize: 25, bold: true, color });
  addText(slide, detail, x + 0.2, y + 1.16, w - 0.38, h - 1.3, { fontSize: 11, color: palette.slate, valign: 'top' });
}

function addBulletList(slide, items, x, y, w, gap = 0.72, color = palette.orange) {
  items.forEach((item, index) => {
    const top = y + index * gap;
    slide.addShape(pptx.ShapeType.ellipse, { x, y: top + 0.08, w: 0.12, h: 0.12, line: { color, transparency: 100 }, fill: { color } });
    addText(slide, item, x + 0.28, top, w - 0.28, gap - 0.08, { fontSize: 15, valign: 'top', breakLine: false });
  });
}

function makeDeck(title, subtitle, kind) {
  pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Papertrail — Bộ mẫu Nhân sự';
  pptx.subject = 'Bộ slide nhân sự có trường dữ liệu thay thế';
  pptx.title = title;
  pptx.company = 'Papertrail';
  pptx.lang = 'vi-VN';
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
    lang: 'vi-VN',
  };

  let slide = pptx.addSlide();
  slide.background = { color: palette.ink };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, line: { color: palette.orange, transparency: 100 }, fill: { color: palette.orange } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.75, y: 0.5, w: 4.2, h: 4.2, line: { color: palette.orange, transparency: 100 }, fill: { color: palette.orange, transparency: 10 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 10.55, y: 1.28, w: 2.62, h: 2.62, line: { color: palette.ink, transparency: 100 }, fill: { color: palette.ink } });
  addText(slide, 'PAPERTRAIL  /  PEOPLE & CULTURE', 0.75, 0.7, 7.3, 0.3, { color: 'FFC4A8', bold: true, fontSize: 11, charSpacing: 2.3 });
  addText(slide, title, 0.75, 1.9, 8.45, 1.55, { fontFace: 'Aptos Display', fontSize: 37, bold: true, color: palette.paper, valign: 'mid', breakLine: false });
  addText(slide, subtitle, 0.78, 3.72, 7.75, 0.85, { color: 'E4E4E4', fontSize: 17, valign: 'top' });
  slide.addShape(pptx.ShapeType.line, { x: 0.78, y: 5.2, w: 1.55, h: 0, line: { color: palette.orange, width: 3.5 } });
  addText(slide, `ĐƠN VỊ  {{ten_cong_ty}}     •     KỲ  {{ky_ke_hoach}}`, 0.78, 5.52, 8.2, 0.34, { color: 'D2D2D2', fontSize: 12 });
  addText(slide, 'BẢN LÀM VIỆC  /  CẬP NHẬT TRƯỚC KHI TRÌNH BÀY', 0.78, 6.95, 8.6, 0.2, { color: 'B8B8B8', fontSize: 8, charSpacing: 1.3 });

  slide = pptx.addSlide();
  addBase(slide, 2, 'BỐI CẢNH');
  addTitle(slide, kind === 'talent' ? 'Bối cảnh & mục tiêu tuyển dụng' : 'Mục tiêu của chương trình hội nhập', 'Cùng thống nhất kết quả cần đạt, đối tượng tham gia và nguyên tắc triển khai.');
  addCard(slide, 0.68, 2.55, 3.75, 2.25, kind === 'talent' ? 'Nhu cầu nhân lực' : 'Nhân sự mới', '{{tong_chi_tieu}}', kind === 'talent' ? 'Vị trí cần tuyển trong kỳ kế hoạch.' : 'Nhân sự tham gia chương trình trong kỳ.', palette.orange);
  addCard(slide, 4.78, 2.55, 3.75, 2.25, 'Thời gian triển khai', '{{thoi_gian_trien_khai}}', 'Mốc bắt đầu, kết thúc và các điểm rà soát chính.', palette.green);
  addCard(slide, 8.88, 2.55, 3.75, 2.25, 'Đầu mối phụ trách', '{{dau_moi_phu_trach}}', 'Điều phối giữa Nhân sự, quản lý và các nhóm liên quan.', palette.ink);
  addBulletList(slide, kind === 'talent'
    ? ['Ưu tiên các vị trí gắn trực tiếp với mục tiêu kinh doanh.', 'Thống nhất tiêu chí và người ra quyết định trước khi mở tuyển.', 'Theo dõi trải nghiệm ứng viên xuyên suốt quy trình.']
    : ['Giúp nhân sự mới hiểu vai trò, văn hóa và cách phối hợp.', 'Chuẩn bị công cụ, tài khoản và người hướng dẫn trước ngày nhận việc.', 'Rà soát tiến độ hội nhập cùng quản lý trực tiếp.'], 0.85, 5.2, 11.6, 0.45);

  slide = pptx.addSlide();
  addBase(slide, 3, 'KẾ HOẠCH');
  addTitle(slide, kind === 'talent' ? 'Kế hoạch thu hút nhân tài' : 'Lộ trình hội nhập 30–60–90 ngày', 'Chuyển mục tiêu thành hoạt động rõ người phụ trách và kết quả đầu ra.');
  const phases = kind === 'talent'
    ? [['01', 'Chuẩn bị', '{{giai_doan_chuan_bi}}', '{{dau_ra_chuan_bi}}'], ['02', 'Tìm kiếm', '{{giai_doan_tim_kiem}}', '{{dau_ra_tim_kiem}}'], ['03', 'Đánh giá', '{{giai_doan_danh_gia}}', '{{dau_ra_danh_gia}}'], ['04', 'Tiếp nhận', '{{giai_doan_tiep_nhan}}', '{{dau_ra_tiep_nhan}}']]
    : [['01', 'Ngày 01–30', '{{muc_tieu_30_ngay}}', '{{dau_ra_30_ngay}}'], ['02', 'Ngày 31–60', '{{muc_tieu_60_ngay}}', '{{dau_ra_60_ngay}}'], ['03', 'Ngày 61–90', '{{muc_tieu_90_ngay}}', '{{dau_ra_90_ngay}}'], ['04', 'Sau 90 ngày', '{{muc_tieu_sau_90_ngay}}', '{{dau_ra_sau_90_ngay}}']];
  phases.forEach((item, index) => {
    const x = 0.72 + index * 3.15;
    slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.65, w: 2.78, h: 3.1, rectRadius: 0.08, line: { color: palette.line, width: 0.8 }, fill: { color: index % 2 ? palette.soft : palette.paper } });
    addText(slide, item[0], x + 0.18, 2.86, 0.5, 0.3, { color: palette.orange, bold: true, fontSize: 15 });
    addText(slide, item[1], x + 0.18, 3.38, 2.35, 0.42, { bold: true, fontSize: 18 });
    addText(slide, item[2], x + 0.18, 4.05, 2.35, 0.65, { fontSize: 13, color: palette.slate, valign: 'top' });
    addText(slide, `KẾT QUẢ\n${item[3]}`, x + 0.18, 4.92, 2.35, 0.54, { fontSize: 11, bold: true, color: palette.green, valign: 'top', breakLine: false });
  });

  slide = pptx.addSlide();
  addBase(slide, 4, 'VẬN HÀNH');
  addTitle(slide, kind === 'talent' ? 'Quy trình & trải nghiệm ứng viên' : 'Trải nghiệm nhân sự mới', 'Một hành trình nhất quán cần có điểm chạm rõ ràng và phản hồi kịp thời.');
  const steps = kind === 'talent'
    ? [['01', 'Tiếp nhận nhu cầu', 'Xác nhận mô tả, tiêu chí và thời hạn.'], ['02', 'Tìm kiếm phù hợp', 'Chọn kênh và thông điệp tuyển dụng.'], ['03', 'Phỏng vấn có cấu trúc', 'Dùng tiêu chí thống nhất, ghi nhận bằng chứng.'], ['04', 'Đề nghị & phản hồi', 'Trao đổi minh bạch, phản hồi đúng hẹn.']]
    : [['01', 'Trước ngày đầu', 'Thiết bị, tài khoản, lịch trình và người hướng dẫn.'], ['02', 'Tuần đầu tiên', 'Giới thiệu đội ngũ, quy trình và mục tiêu vai trò.'], ['03', 'Tháng đầu tiên', 'Đào tạo công việc, trao đổi phản hồi định kỳ.'], ['04', 'Đánh giá hội nhập', 'Thống nhất kết quả và kế hoạch phát triển.']];
  steps.forEach((item, index) => {
    const y = 2.48 + index * 0.94;
    slide.addShape(pptx.ShapeType.ellipse, { x: 0.82, y: y + 0.05, w: 0.48, h: 0.48, line: { color: palette.orange, width: 1 }, fill: { color: palette.blush } });
    addText(slide, item[0], 0.87, y + 0.19, 0.38, 0.13, { fontSize: 9, bold: true, color: palette.orangeDark, align: 'center' });
    addText(slide, item[1], 1.58, y, 3.1, 0.32, { fontSize: 17, bold: true });
    addText(slide, item[2], 4.82, y, 6.85, 0.4, { fontSize: 13, color: palette.slate });
    if (index < steps.length - 1) slide.addShape(pptx.ShapeType.line, { x: 1.06, y: y + 0.56, w: 0, h: 0.39, line: { color: palette.line, width: 1.2 } });
  });
  slide.addShape(pptx.ShapeType.roundRect, { x: 1.58, y: 6.18, w: 10.45, h: 0.48, rectRadius: 0.06, line: { color: palette.blush, transparency: 100 }, fill: { color: palette.blush } });
  addText(slide, `CAM KẾT DỊCH VỤ  •  {{cam_ket_dich_vu}}`, 1.82, 6.31, 10, 0.16, { fontSize: 10, color: palette.orangeDark, bold: true });

  slide = pptx.addSlide();
  addBase(slide, 5, 'ĐO LƯỜNG');
  addTitle(slide, 'Chỉ số theo dõi & trách nhiệm', 'Đo lường trải nghiệm, tiến độ và hiệu quả; sử dụng số liệu đã được xác nhận.');
  const metricLabels = kind === 'talent'
    ? [['Thời gian tuyển', '{{muc_tieu_thoi_gian_tuyen}}', 'Theo dõi từ lúc duyệt yêu cầu đến khi nhận việc.'], ['Tỷ lệ nhận việc', '{{muc_tieu_nhan_viec}}', 'Đánh giá mức độ phù hợp của đề nghị.'], ['Chất lượng tuyển', '{{muc_tieu_chat_luong}}', 'Rà soát kết quả sau thử việc.']]
    : [['Hoàn tất chuẩn bị', '{{muc_tieu_chuan_bi}}', 'Kiểm tra trước ngày nhận việc.'], ['Mức độ hài lòng', '{{muc_tieu_hai_long}}', 'Thu thập phản hồi ở các mốc hội nhập.'], ['Đạt mục tiêu vai trò', '{{muc_tieu_hieu_suat}}', 'Quản lý đánh giá theo tiêu chí đã thống nhất.']];
  metricLabels.forEach((metric, index) => addCard(slide, 0.78 + index * 4.13, 2.64, 3.72, 2.15, metric[0], metric[1], metric[2], index === 1 ? palette.green : palette.orange));
  addText(slide, 'NGƯỜI CHỊU TRÁCH NHIỆM', 0.85, 5.34, 3.6, 0.2, { fontSize: 10, color: palette.gray, bold: true, charSpacing: 1.1 });
  addText(slide, '{{nguoi_chiu_trach_nhiem}}', 0.85, 5.72, 6.0, 0.34, { fontSize: 18, bold: true });
  addText(slide, 'BÁO CÁO ĐỊNH KỲ', 7.1, 5.34, 3.6, 0.2, { fontSize: 10, color: palette.gray, bold: true, charSpacing: 1.1 });
  addText(slide, '{{tan_suat_bao_cao}}', 7.1, 5.72, 4.7, 0.34, { fontSize: 18, bold: true });

  slide = pptx.addSlide();
  addBase(slide, 6, 'HÀNH ĐỘNG');
  addTitle(slide, 'Rủi ro, quyết định & bước tiếp theo', 'Kết thúc bằng hành động cụ thể để kế hoạch có thể bắt đầu ngay.');
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 2.48, w: 5.75, h: 3.34, rectRadius: 0.08, line: { color: palette.line, width: 0.8 }, fill: { color: palette.soft } });
  addText(slide, 'RỦI RO CẦN THEO DÕI', 1.05, 2.79, 4.95, 0.28, { fontSize: 11, bold: true, color: palette.orangeDark, charSpacing: 1.2 });
  addBulletList(slide, ['{{rui_ro_uu_tien_1}}', '{{rui_ro_uu_tien_2}}', '{{phuong_an_ung_pho}}'], 1.08, 3.32, 4.95, 0.68, palette.orange);
  slide.addShape(pptx.ShapeType.roundRect, { x: 6.82, y: 2.48, w: 5.75, h: 3.34, rectRadius: 0.08, line: { color: palette.line, width: 0.8 }, fill: { color: palette.paper } });
  addText(slide, 'BƯỚC TIẾP THEO', 7.12, 2.79, 4.95, 0.28, { fontSize: 11, bold: true, color: palette.green, charSpacing: 1.2 });
  addBulletList(slide, ['{{hanh_dong_tiep_theo_1}}', '{{hanh_dong_tiep_theo_2}}', 'Người phụ trách: {{dau_moi_phu_trach}}'], 7.15, 3.32, 4.95, 0.68, palette.green);
  addText(slide, 'CẢM ƠN', 0.78, 6.2, 2.0, 0.3, { fontSize: 17, bold: true, color: palette.orange });
  addText(slide, '{{ten_cong_ty}}   •   {{email_lien_he}}', 3.0, 6.2, 8.7, 0.3, { fontSize: 12, color: palette.gray, align: 'right' });
  return pptx;
}

function thumbnailSvg({ title, eyebrow, subtitle, tag, accent, type }) {
  const safe = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const isSlide = type === 'slide';
  const titleLines = title.split('|');
  const lines = titleLines.map((line, index) => `<text x="82" y="${245 + index * 76}" font-family="Arial, sans-serif" font-size="${isSlide ? 56 : 58}" font-weight="700" fill="#111111">${safe(line)}</text>`).join('');
  const visual = isSlide
    ? `<rect x="752" y="126" width="344" height="270" rx="18" fill="#ffffff" stroke="#dedede" stroke-width="2"/><rect x="782" y="158" width="12" height="206" rx="6" fill="#${accent}"/><circle cx="925" cy="233" r="56" fill="#${accent}" opacity=".13"/><circle cx="925" cy="233" r="32" fill="#${accent}"/><rect x="858" y="304" width="186" height="13" rx="6" fill="#dedede"/><rect x="858" y="332" width="132" height="13" rx="6" fill="#eeeeee"/><rect x="858" y="358" width="160" height="13" rx="6" fill="#eeeeee"/>`
    : `<rect x="800" y="96" width="250" height="340" rx="8" fill="#ffffff" stroke="#dedede" stroke-width="3"/><rect x="800" y="96" width="250" height="19" rx="8" fill="#${accent}"/><rect x="828" y="145" width="138" height="9" rx="4" fill="#${accent}"/><rect x="828" y="184" width="190" height="18" rx="5" fill="#111111"/><rect x="828" y="218" width="166" height="9" rx="4" fill="#cccccc"/><rect x="828" y="264" width="194" height="7" rx="3" fill="#dddddd"/><rect x="828" y="284" width="178" height="7" rx="3" fill="#dddddd"/><rect x="828" y="304" width="186" height="7" rx="3" fill="#dddddd"/><rect x="828" y="350" width="92" height="39" rx="7" fill="#${accent}" opacity=".12"/><rect x="932" y="350" width="88" height="39" rx="7" fill="#f2f2f2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#f5f5f5"/><rect x="0" y="0" width="16" height="675" fill="#${accent}"/><text x="82" y="102" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="#${accent}">${safe(eyebrow.toLocaleUpperCase('vi-VN'))}</text>${lines}<text x="84" y="${245 + titleLines.length * 76 + 24}" font-family="Arial, sans-serif" font-size="23" fill="#555555">${safe(subtitle)}</text><rect x="82" y="${245 + titleLines.length * 76 + 88}" width="78" height="6" rx="3" fill="#${accent}"/><text x="82" y="590" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2" fill="#555555">PAPERTRAIL  /  NHÂN SỰ</text><rect x="82" y="610" width="210" height="34" rx="17" fill="#ffffff" stroke="#dedede"/><text x="103" y="633" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#111111">${safe(tag)}</text>${visual}</svg>`;
}

const thumbnailSpecs = [
  { file: 'hr-recruitment-plan.png', title: 'Kế hoạch|tuyển dụng', eyebrow: 'Hoạch định nhân lực', subtitle: 'Nhu cầu • ngân sách • tiến độ', tag: 'TÀI LIỆU WORD', accent: 'F45100', type: 'document' },
  { file: 'hr-interview-scorecard.png', title: 'Phiếu đánh giá|phỏng vấn', eyebrow: 'Tuyển chọn công bằng', subtitle: 'Năng lực • bằng chứng • đề xuất', tag: 'TÀI LIỆU WORD', accent: '27745B', type: 'document' },
  { file: 'hr-talent-acquisition-plan.png', title: 'Chiến lược|thu hút nhân tài', eyebrow: 'Kế hoạch nhân sự', subtitle: 'Tuyển đúng người, đúng thời điểm', tag: 'POWERPOINT', accent: 'F45100', type: 'slide' },
  { file: 'hr-employee-onboarding.png', title: 'Hội nhập|nhân sự mới', eyebrow: 'Trải nghiệm nhân viên', subtitle: 'Lộ trình đồng hành 30–60–90 ngày', tag: 'POWERPOINT', accent: '27745B', type: 'slide' },
];

async function main() {
  await Promise.all([mkdir(documents, { recursive: true }), mkdir(presentations, { recursive: true }), mkdir(thumbnails, { recursive: true })]);
  const docxOutputs = [
    ['hr-recruitment-plan.docx', recruitmentPlan],
    ['hr-interview-scorecard.docx', interviewScorecard],
  ];
  for (const [fileName, document] of docxOutputs) {
    const buffer = await Packer.toBuffer(document);
    await writeFile(path.join(documents, fileName), buffer);
    console.log(`Đã tạo ${path.relative(root, path.join(documents, fileName))} (${buffer.length} byte)`);
  }

  const decks = [
    ['hr-talent-acquisition-plan.pptx', 'Chiến lược thu hút nhân tài', 'Kế hoạch nhân sự gắn với ưu tiên kinh doanh và trải nghiệm ứng viên.', 'talent'],
    ['hr-employee-onboarding.pptx', 'Chương trình hội nhập nhân sự mới', 'Lộ trình 30–60–90 ngày giúp nhân sự mới bắt nhịp và tạo giá trị.', 'onboarding'],
  ];
  for (const [fileName, title, subtitle, kind] of decks) {
    const deck = makeDeck(title, subtitle, kind);
    const buffer = await deck.write({ outputType: 'nodebuffer' });
    await writeFile(path.join(presentations, fileName), buffer);
    console.log(`Đã tạo ${path.relative(root, path.join(presentations, fileName))} (${buffer.length} byte, ${deck._slides.length} slide)`);
  }

  for (const spec of thumbnailSpecs) {
    const png = await sharp(Buffer.from(thumbnailSvg(spec))).png().toBuffer();
    await writeFile(path.join(thumbnails, spec.file), png);
    console.log(`Đã tạo ${path.relative(root, path.join(thumbnails, spec.file))} (${png.length} byte)`);
  }
}

let pptx;
main().catch((error) => {
  console.error('Không thể tạo bộ mẫu HR:', error);
  process.exitCode = 1;
});
