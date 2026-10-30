import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  AlignmentType,
  BorderStyle,
  Document,
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const storage = path.join(root, 'storage', 'templates');
const documentsDir = path.join(storage, 'documents');
const presentationsDir = path.join(storage, 'presentations');
const manifestPath = path.join(storage, 'manifest.json');
const documentsOnly = process.argv.includes('--documents-only');
const presentationsOnly = process.argv.includes('--presentations-only');

const palette = {
  navy: '0A0A0A',
  blue: '333333',
  teal: 'F45100',
  pale: 'F7F7F7',
  ink: '222222',
  gray: '555555',
  line: 'DEDEDE',
  orange: 'F45100',
  white: 'FFFFFF',
};

const viKey = {
  report:'bao_cao', title:'tieu_de', reporting:'bao_cao', period:'ky', company:'cong_ty', name:'ten', prepared:'lap', by:'boi', total:'tong', revenue:'doanh_thu', gross:'gop', margin:'bien', subscription:'thue_bao', plan:'ke_hoach', services:'dich_vu', growth:'tang_truong', target:'muc_tieu', retention:'giu_chan', rate:'ty_le', pipeline:'co_hoi', coverage:'bao_phu', executive:'dieu_hanh', owner:'phu_trach', next:'tiep_theo', review:'ra_soat', date:'ngay', full:'day_du', email:'email', phone:'dien_thoai', professional:'chuyen_mon', city:'thanh_pho', country:'quoc_gia', portfolio:'ho_so_nang_luc', url:'duong_dan', summary:'tom_tat', skill:'ky_nang', job:'cong_viec', start:'bat_dau', end:'ket_thuc', achievement:'thanh_tuu', previous:'truoc', role:'vai_tro', degree:'bang_cap', institution:'co_so_dao_tao', graduation:'tot_nghiep', year:'nam', project:'du_an', description:'mo_ta', technology:'cong_nghe', stack:'nen_tang', certifications:'chung_chi', languages:'ngon_ngu', employee:'nhan_vien', id:'ma', department:'phong_ban', leave:'nghi_phep', work:'cong_viec', manager:'quan_ly', type:'loai', number:'so', days:'ngay', return:'tro_lai', emergency:'khan_cap', contact:'lien_he', handover:'ban_giao', supporting:'bo_sung', notes:'ghi_chu', signature:'chu_ky', signed:'ky', hr:'nhan_su', reviewer:'nguoi_duyet', decision:'quyet_dinh', meeting:'cuoc_hop', chair:'chu_tri', attendee:'tham_du', action:'hanh_dong', due:'han', location:'dia_diem', minute:'bien_ban', taker:'nguoi_ghi', apologies:'vang_mat', agenda:'chuong_trinh', item:'hang_muc', discussion:'thao_luan', notes:'ghi_chu', owner:'phu_trach', summary:'tom_tat', sponsor:'nha_tai_tro', project:'du_an', manager:'quan_ly', estimated:'du_kien', budget:'ngan_sach', document:'tai_lieu', version:'phien_ban', proposal:'de_xuat', overview:'tong_quan', business:'kinh_doanh', problem:'van_de', audience:'doi_tuong', objective:'muc_tieu', success:'thanh_cong', measure:'chi_so', in:'trong', scope:'pham_vi', out:'ngoai', phase:'giai_doan', output:'dau_ra', deliverable:'ban_giao', funding:'nguon_von', risk:'rui_ro', impact:'anh_huong', response:'ung_pho', key:'trong_yeu', assumption:'gia_dinh', validation:'xac_minh', approval:'phe_duyet', presentation:'trinh_chieu', founded:'thanh_lap', headquarters:'tru_so', customer:'khach_hang', count:'so_luong', markets:'thi_truong', mission:'su_menh', statement:'tuyen_bo', vision:'tam_nhin', service:'dich_vu', benefit:'loi_ich', leader:'lanh_dao', team:'doi_ngu', size:'quy_mo', website:'trang_web', office:'van_phong', address:'dia_chi', overall:'tong_the', status:'trang_thai', actual:'thuc_te', attainment:'muc_dat', driver:'dong_luc', challenge:'thach_thuc', new:'moi', expansion:'mo_rong', confidence:'do_tin_cay', forecast:'du_bao', win:'ket_qua_tot', signal:'tin_hieu', priority:'uu_tien', checkpoint:'moc_kiem_tra', goal:'muc_tieu', milestone:'cot_moc', technical:'ky_thuat', lead:'truong_nhom', due:'han', audience:'doi_tuong', website:'trang_web', date:'ngay', head:'tru_so', country:'quoc_gia', city:'thanh_pho', service:'dich_vu', hr:'nhan_su'
  ,of:'cua', reason:'ly_do', items:'hang_muc', dates:'ngay', list:'danh_sach', customers:'khach_hang', over:'so_voi', measures:'cac_chi_so', cost:'chi_phi', costs:'chi_phi', net:'rong', profit:'loi_nhuan', analysis:'phan_tich', issue:'van_de', mitigation:'giam_thieu', operating:'van_hanh', performance:'ket_qua'
};
const viKeyOverrides = {
  net_profit: 'loi_nhuan_rong', operating_cost: 'chi_phi_van_hanh', number_of_days: 'so_ngay',
  business_problem: 'van_de_kinh_doanh', target_audience: 'doi_tuong_muc_tieu', success_measure_1: 'chi_so_thanh_cong_1',
  success_measure_2: 'chi_so_thanh_cong_2', success_measure_3: 'chi_so_thanh_cong_3', performance_analysis: 'phan_tich_ket_qua',
  gross_margin: 'bien_loi_nhuan_gop', subscription_revenue: 'doanh_thu_thue_bao', services_revenue: 'doanh_thu_dich_vu',
};
function localizeToken(key) {
  if (viKeyOverrides[key]) return viKeyOverrides[key];
  return key.split('_').map((part) => /^\d+$/.test(part) ? part : (viKey[part] ?? part)).join('_');
}
function translateTokens(text) {
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => `{{${localizeToken(key)}}}`);
}

const run = (text, options = {}) => new TextRun({
  text: typeof text === 'string' ? translateTokens(text) : text,
  font: 'Aptos',
  language: { value: 'vi-VN', eastAsia: 'vi-VN' },
  ...options,
});
const para = (text, options = {}) => new Paragraph({
  children: typeof text === 'string' ? [run(text)] : text,
  spacing: { after: 110, line: 280, ...options.spacing },
  ...options,
});
const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({
  text,
  heading: level,
  spacing: { before: 260, after: 100 },
});
const bullet = (text) => new Paragraph({
  text: translateTokens(text),
  bullet: { level: 0 },
  indent: { left: 720, hanging: 360 },
  spacing: { after: 70 },
});

function cell(text, header = false, options = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [run(text, {
        bold: header || options.emphasis,
        color: header ? palette.white : palette.ink,
        size: header ? 19 : 20,
      })],
      spacing: { before: 55, after: 55, line: 250 },
    })],
    shading: header
      ? { type: ShadingType.CLEAR, fill: palette.navy }
      : options.shade ? { type: ShadingType.CLEAR, fill: 'F3F6F8' } : undefined,
    margins: { top: 105, bottom: 105, left: 125, right: 125 },
    width: { size: 100 / 3, type: WidthType.PERCENTAGE },
  });
}

function dataTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: headers.map(() => 3000),
    rows: [
      new TableRow({ children: headers.map((value) => cell(value, true)), tableHeader: true }),
      ...rows.map((row, rowIndex) => new TableRow({
        cantSplit: true,
        children: row.map((value, cellIndex) => cell(value, false, {
          emphasis: cellIndex === 0,
          shade: rowIndex % 2 === 1,
        })),
      })),
    ],
    borders: Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].map((side) => [side, {
      style: BorderStyle.SINGLE, size: side === 'top' || side === 'bottom' ? 6 : 4, color: palette.line,
    }])),
  });
}

function doc(title, subtitle, children) {
  return new Document({
    creator: 'Thư viện Mẫu Tài liệu',
    title,
    description: subtitle,
    styles: {
      default: {
        document: { run: { font: 'Aptos', size: 22, color: palette.ink, language: { value: 'vi-VN', eastAsia: 'vi-VN' } }, paragraph: { spacing: { after: 100 } } },
        heading1: { run: { font: 'Aptos Display', size: 30, bold: true, color: palette.navy, language: { value: 'vi-VN', eastAsia: 'vi-VN' } }, paragraph: { spacing: { before: 280, after: 120 } } },
        heading2: { run: { font: 'Aptos', size: 26, bold: true, color: palette.teal, language: { value: 'vi-VN', eastAsia: 'vi-VN' } }, paragraph: { spacing: { before: 180, after: 80 } } },
        title: { run: { font: 'Aptos Display', size: 42, bold: true, color: palette.navy, language: { value: 'vi-VN', eastAsia: 'vi-VN' } }, paragraph: { spacing: { before: 120, after: 100 } } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, right: 900, bottom: 900, left: 900 },
        },
      },
      children: [
        new Paragraph({
          children: [run('THƯ VIỆN MẪU TÀI LIỆU', { bold: true, color: palette.teal, size: 18, characterSpacing: 20 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [run(title, { font: 'Aptos Display', size: 42, bold: true, color: palette.navy })],
          heading: HeadingLevel.TITLE,
          border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: palette.orange, space: 8 } },
          spacing: { after: 170 },
        }),
        new Paragraph({ children: [run(subtitle, { color: palette.gray, size: 21 })], spacing: { after: 250 } }),
        ...children,
      ],
    }],
  });
}

const docs = [
  {
    id: 1, slug: 'business-report', title: 'Báo cáo Kết quả Kinh doanh', name: 'Báo cáo kết quả kinh doanh', category: 'Kinh doanh',
    description: 'Mẫu báo cáo kinh doanh theo quý gồm tóm tắt điều hành, doanh thu, chỉ số hiệu suất và bảng dữ liệu có thể chỉnh sửa.',
    placeholders: ['{{report_title}}', '{{reporting_period}}', '{{company_name}}', '{{prepared_by}}', '{{total_revenue}}', '{{gross_margin}}'],
    preview: ['Báo cáo Kết quả Kinh doanh', 'Kỳ báo cáo và người lập', 'Tóm tắt điều hành', 'Doanh thu và kết quả kinh doanh', 'Bảng chỉ số hiệu suất', 'Ưu tiên và bước tiếp theo'],
    content: () => [
      para([run('Tên báo cáo: ', { bold: true }), run('{{report_title}}  |  Kỳ báo cáo: {{reporting_period}}')]),
      para([run('Công ty: ', { bold: true }), run('{{company_name}}  |  Người lập: {{prepared_by}}')]),
      heading('Tóm tắt điều hành'),
      para('Báo cáo này tổng hợp kết quả hoạt động của tổ chức trong kỳ {{reporting_period}}. Doanh thu duy trì ổn định nhờ gia hạn hợp đồng doanh nghiệp và cải thiện tỷ lệ chuyển đổi trên kênh số. Trong kỳ tiếp theo, công ty sẽ tập trung bảo vệ biên lợi nhuận, giữ chân khách hàng và nâng cao khả năng dự báo doanh số.'),
      heading('Doanh thu và kết quả kinh doanh'),
      para('Doanh thu ghi nhận đạt {{total_revenue}}, chi phí vận hành là {{operating_cost}} và lợi nhuận ròng đạt {{net_profit}}. Biên lợi nhuận gộp đạt {{gross_margin}}. Bộ phận tài chính cần thay các trường này bằng số liệu cuối cùng đã đối soát trước khi phát hành.'),
      dataTable(['Mảng kinh doanh', 'Thực tế', 'Kế hoạch'], [
        ['Thuê bao', '{{subscription_revenue}}', '{{subscription_plan}}'],
        ['Dịch vụ chuyên môn', '{{services_revenue}}', '{{services_plan}}'],
        ['Tổng doanh thu', '{{total_revenue}}', '{{total_plan}}'],
      ]),
      heading('Các chỉ số hiệu suất chính'),
      dataTable(['Chỉ số', 'Kết quả', 'Mục tiêu'], [
        ['Tăng trưởng doanh thu', '{{revenue_growth}}', '{{revenue_growth_target}}'],
        ['Biên lợi nhuận gộp', '{{gross_margin}}', '{{gross_margin_target}}'],
        ['Tỷ lệ giữ chân khách hàng', '{{retention_rate}}', '{{retention_target}}'],
        ['Mức độ bao phủ cơ hội bán hàng', '{{pipeline_coverage}}', '{{pipeline_target}}'],
      ]),
      heading('Phân tích kết quả, rủi ro và kế hoạch hành động'),
      para('Phân tích chính: {{performance_analysis}}'),
      dataTable(['Rủi ro / vấn đề', 'Mức độ ảnh hưởng', 'Kế hoạch xử lý và phụ trách'], [
        ['{{risk_1}}', '{{risk_impact_1}}', '{{mitigation_plan_1}} / {{action_owner_1}}'],
        ['{{issue_1}}', '{{issue_impact_1}}', '{{action_plan_1}} / {{action_owner_1}}'],
      ]),
      heading('Ưu tiên của ban điều hành'),
      bullet('Bảo vệ tỷ lệ gia hạn bằng cách rà soát rủi ro sớm và chủ động trao đổi với khách hàng.'),
      bullet('Cải thiện dự báo bán hàng bằng cách thống nhất tiêu chí từng giai đoạn và rà soát cơ hội hằng tuần.'),
      bullet('Đối chiếu kế hoạch tuyển dụng và chi phí phát sinh với kế hoạch vận hành mới nhất.'),
      para([run('Người phụ trách: ', { bold: true }), run('{{executive_owner}}  '), run('Ngày rà soát tiếp theo: ', { bold: true }), run('{{next_review_date}}')]),
    ],
  },
  {
    id: 2, slug: 'resume', title: 'Hồ sơ Ứng tuyển', name: 'Hồ sơ ứng tuyển', category: 'Nghề nghiệp',
    description: 'Mẫu hồ sơ ứng tuyển có thể chỉnh sửa, gồm thông tin liên hệ, giới thiệu, kỹ năng, kinh nghiệm, học vấn và dự án tiêu biểu.',
    placeholders: ['{{full_name}}', '{{email}}', '{{phone}}', '{{professional_title}}', '{{company_name}}', '{{project_name}}'],
    preview: ['Hồ sơ Ứng tuyển', 'Thông tin liên hệ', 'Giới thiệu bản thân', 'Kỹ năng chính', 'Kinh nghiệm làm việc', 'Học vấn và dự án tiêu biểu'],
    content: () => [
      new Paragraph({ text: translateTokens('{{full_name}}'), heading: HeadingLevel.TITLE, spacing: { after: 40 } }),
      para([run('{{professional_title}}', { bold: true, color: palette.teal }), run('  |  {{city}}, {{country}}')]),
      para('{{email}}  |  {{phone}}  |  {{portfolio_url}}'),
      heading('Giới thiệu bản thân'),
      para('{{professional_summary}} Là người làm việc hướng đến kết quả, có kinh nghiệm chuyển hóa nhu cầu kinh doanh thành kết quả đo lường được. Có khả năng giao tiếp rõ ràng, thực thi đáng tin cậy và phối hợp giải quyết vấn đề.'),
      heading('Kỹ năng chính'),
      para('{{skill_1}}  •  {{skill_2}}  •  {{skill_3}}  •  {{skill_4}}  •  {{skill_5}}'),
      heading('Kinh nghiệm làm việc'),
      para([run('{{job_title}}  |  {{company_name}}', { bold: true }), run('  |  {{start_date}} – {{end_date}}')]),
      bullet('{{achievement_1}} — mô tả hành động đã thực hiện và kết quả có thể đo lường.'),
      bullet('{{achievement_2}} — nêu quy mô, phạm vi hoặc tác động đến hoạt động kinh doanh nếu có.'),
      bullet('{{achievement_3}} — làm nổi bật khả năng phối hợp, tinh thần trách nhiệm hoặc cải tiến quy trình.'),
      para([run('{{previous_job_title}}  |  {{previous_company}}', { bold: true }), run('  |  {{previous_start_date}} – {{previous_end_date}}')]),
      bullet('{{previous_role_achievement}}'),
      heading('Học vấn'),
      para([run('{{degree}}', { bold: true }), run('  |  {{institution}}  |  {{graduation_year}}')]),
      heading('Dự án tiêu biểu'),
      para([run('{{project_name}}', { bold: true }), run(' — {{project_description}}')]),
      para([run('Công cụ và công nghệ: ', { bold: true }), run('{{project_technology_stack}}')]),
      heading('Thông tin bổ sung', HeadingLevel.HEADING_2),
      para('Chứng chỉ: {{certifications}}  |  Ngôn ngữ: {{languages}}'),
    ],
  },
  {
    id: 3, slug: 'leave-request', title: 'Đơn Xin Nghỉ Phép', name: 'Đơn xin nghỉ phép', category: 'Nhân sự',
    description: 'Mẫu đơn xin nghỉ phép gồm thông tin nhân viên, thời gian nghỉ, lý do, kế hoạch bàn giao và phần xác nhận phê duyệt.',
    placeholders: ['{{employee_name}}', '{{employee_id}}', '{{department}}', '{{leave_start_date}}', '{{leave_end_date}}', '{{leave_reason}}'],
    preview: ['Đơn Xin Nghỉ Phép', 'Thông tin nhân viên và bộ phận', 'Thời gian và loại nghỉ phép', 'Lý do và ghi chú bàn giao', 'Xác nhận của nhân viên và quản lý'],
    content: () => [
      para('Vui lòng điền đầy đủ thông tin và gửi đơn cho quản lý theo quy định nghỉ phép của công ty.'),
      heading('Thông tin nhân viên'),
      dataTable(['Thông tin', 'Nội dung', 'Thông tin'], [
        ['Họ và tên', '{{employee_name}}', 'Mã nhân viên: {{employee_id}}'],
        ['Bộ phận', '{{department}}', 'Chức danh: {{job_title}}'],
        ['Email công việc', '{{work_email}}', 'Quản lý trực tiếp: {{manager_name}}'],
      ]),
      heading('Thông tin nghỉ phép'),
      dataTable(['Nội dung', 'Chi tiết', 'Nội dung'], [
        ['Loại nghỉ phép', '{{leave_type}}', 'Số ngày làm việc: {{number_of_days}}'],
        ['Ngày bắt đầu nghỉ', '{{leave_start_date}}', 'Ngày kết thúc nghỉ: {{leave_end_date}}'],
        ['Ngày trở lại làm việc', '{{return_date}}', 'Liên hệ khi cần: {{emergency_contact}}'],
      ]),
      heading('Lý do và bàn giao công việc'),
      para('{{leave_reason}}'),
      para([run('Kế hoạch bàn giao: ', { bold: true }), run('{{handover_plan}}')]),
      para([run('Ghi chú bổ sung: ', { bold: true }), run('{{supporting_notes}}')]),
      heading('Xác nhận và phê duyệt'),
      para('Tôi xác nhận thông tin trên là chính xác và đã tìm hiểu quy định nghỉ phép áp dụng.'),
      dataTable(['Vai trò', 'Họ tên và chữ ký', 'Ngày'], [
        ['Nhân viên', '{{employee_name}} / {{employee_signature}}', '{{employee_signed_date}}'],
        ['Quản lý trực tiếp', '{{manager_name}} / {{manager_signature}}', '{{manager_decision_date}}'],
        ['Bộ phận nhân sự', '{{hr_reviewer}} / {{hr_signature}}', '{{hr_decision_date}}'],
      ]),
      para('Kết quả:  ☐ Chấp thuận   ☐ Từ chối   ☐ Cần bổ sung thông tin', { spacing: { before: 150 } }),
    ],
  },
  {
    id: 4, slug: 'meeting-minutes', title: 'Biên bản Cuộc họp', name: 'Biên bản cuộc họp', category: 'Vận hành',
    description: 'Mẫu biên bản ghi nhận thông tin cuộc họp, người tham dự, chương trình, nội dung thảo luận, quyết định và công việc cần thực hiện.',
    placeholders: ['{{meeting_title}}', '{{meeting_date}}', '{{meeting_chair}}', '{{attendee_list}}', '{{action_owner}}', '{{due_date}}'],
    preview: ['Biên bản Cuộc họp', 'Thông tin cuộc họp và người tham dự', 'Chương trình họp', 'Thảo luận và quyết định', 'Danh sách công việc, người phụ trách và hạn hoàn thành'],
    content: () => [
      dataTable(['Thông tin cuộc họp', 'Nội dung', 'Thông tin cuộc họp'], [
        ['Tên cuộc họp', '{{meeting_title}}', 'Thời gian: {{meeting_date}}'],
        ['Địa điểm / đường dẫn', '{{meeting_location}}', 'Chủ trì: {{meeting_chair}}'],
        ['Người ghi biên bản', '{{minute_taker}}', 'Cuộc họp tiếp theo: {{next_meeting_date}}'],
      ]),
      heading('Người tham dự'),
      para('Có mặt: {{attendee_list}}'),
      para('Vắng mặt: {{apologies}}'),
      heading('Chương trình họp'),
      bullet('1. {{agenda_item_1}}'),
      bullet('2. {{agenda_item_2}}'),
      bullet('3. {{agenda_item_3}}'),
      heading('Nội dung thảo luận và quyết định'),
      para([run('{{agenda_item_1}} — ', { bold: true }), run('{{discussion_notes_1}}')]),
      para([run('{{agenda_item_2}} — ', { bold: true }), run('{{discussion_notes_2}}')]),
      para([run('{{decision_summary}}', { bold: true })]),
      heading('Danh sách công việc cần thực hiện'),
      dataTable(['Công việc', 'Người phụ trách', 'Hạn hoàn thành'], [
        ['{{action_1}}', '{{action_owner}}', '{{due_date}}'],
        ['{{action_2}}', '{{action_owner_2}}', '{{due_date_2}}'],
        ['{{action_3}}', '{{action_owner_3}}', '{{due_date_3}}'],
      ]),
      para('Biên bản do {{minute_taker}} lập và {{meeting_chair}} rà soát.'),
    ],
  },
  {
    id: 5, slug: 'project-proposal', title: 'Đề xuất Dự án', name: 'Đề xuất dự án', category: 'Dự án',
    description: 'Mẫu đề xuất dự án phục vụ phê duyệt, trình bày lý do, mục tiêu, phạm vi, kế hoạch thực hiện, sản phẩm bàn giao và rủi ro.',
    placeholders: ['{{project_name}}', '{{sponsor_name}}', '{{project_manager}}', '{{target_start_date}}', '{{target_end_date}}', '{{estimated_budget}}'],
    preview: ['Đề xuất Dự án', 'Tổng quan và cơ sở kinh doanh', 'Mục tiêu và tiêu chí thành công', 'Phạm vi và nội dung loại trừ', 'Tiến độ và sản phẩm bàn giao', 'Rủi ro và giả định'],
    content: () => [
      para([run('Tên dự án: ', { bold: true }), run('{{project_name}}  |  Nhà tài trợ: {{sponsor_name}}')]),
      para([run('Quản lý dự án: ', { bold: true }), run('{{project_manager}}  |  Phiên bản: {{document_version}}  |  Ngày: {{proposal_date}}')]),
      heading('Tổng quan dự án'),
      para('{{project_overview}} Đề xuất này xin phê duyệt triển khai {{project_name}} nhằm giải quyết {{business_problem}} và tạo ra giá trị có thể đo lường cho {{target_audience}}.'),
      heading('Mục tiêu và tiêu chí thành công'),
      bullet('{{objective_1}} — tiêu chí thành công: {{success_measure_1}}.'),
      bullet('{{objective_2}} — tiêu chí thành công: {{success_measure_2}}.'),
      bullet('{{objective_3}} — tiêu chí thành công: {{success_measure_3}}.'),
      heading('Phạm vi dự án'),
      para([run('Trong phạm vi: ', { bold: true }), run('{{in_scope_items}}')]),
      para([run('Ngoài phạm vi: ', { bold: true }), run('{{out_of_scope_items}}')]),
      heading('Kế hoạch và tiến độ thực hiện'),
      dataTable(['Giai đoạn', 'Thời gian dự kiến', 'Kết quả bàn giao'], [
        ['Khảo sát và lập kế hoạch', '{{phase_1_dates}}', '{{phase_1_output}}'],
        ['Thiết kế và xây dựng', '{{phase_2_dates}}', '{{phase_2_output}}'],
        ['Kiểm thử và ra mắt', '{{phase_3_dates}}', '{{phase_3_output}}'],
      ]),
      para([run('Ngày bắt đầu dự kiến: ', { bold: true }), run('{{target_start_date}}  '), run('Ngày hoàn tất dự kiến: ', { bold: true }), run('{{target_end_date}}')]),
      heading('Sản phẩm bàn giao'),
      bullet('{{deliverable_1}}'), bullet('{{deliverable_2}}'), bullet('{{deliverable_3}}'),
      para([run('Ngân sách dự kiến: ', { bold: true }), run('{{estimated_budget}}  '), run('Đơn vị phụ trách ngân sách: ', { bold: true }), run('{{funding_owner}}')]),
      heading('Rủi ro và giả định'),
      dataTable(['Rủi ro / giả định', 'Mức độ ảnh hưởng', 'Phương án / người phụ trách'], [
        ['{{risk_1}}', '{{risk_1_impact}}', '{{risk_1_response}} / {{risk_1_owner}}'],
        ['{{risk_2}}', '{{risk_2_impact}}', '{{risk_2_response}} / {{risk_2_owner}}'],
        ['Giả định: {{key_assumption}}', '{{assumption_impact}}', 'Xác minh trước {{assumption_validation_date}}'],
      ]),
      heading('Phê duyệt'),
      para('Nhà tài trợ: {{sponsor_name}}  |  Quyết định: {{approval_decision}}  |  Ngày: {{approval_date}}'),
    ],
  },
];

const pptTemplates = [
  {
    id: 6, slug: 'company-intro', title: 'Giới thiệu Công ty', name: 'Giới thiệu công ty', category: 'Doanh nghiệp',
    description: 'Bộ trình chiếu sáu trang giới thiệu tổng quan, sứ mệnh, tầm nhìn, dịch vụ, đội ngũ và thông tin liên hệ công ty.',
    slides: [
      ['Giới thiệu Công ty', 'Tổng quan về chúng tôi và giá trị chúng tôi mang lại', 'Trình bày cho {{audience}}  •  Ngày {{presentation_date}}'],
      ['Tổng quan Công ty', 'Đội ngũ tập trung biến thách thức phức tạp thành kết quả thiết thực.', 'Năm thành lập: {{founded_year}}\nTrụ sở chính: {{headquarters}}\nSố khách hàng: {{customer_count}}\nThị trường trọng điểm: {{markets}}'],
      ['Sứ mệnh và Tầm nhìn', 'Sứ mệnh của chúng tôi', '{{mission_statement}}', 'Tầm nhìn của chúng tôi', '{{vision_statement}}'],
      ['Dịch vụ', 'Dịch vụ được xây dựng để tạo ra kết quả cụ thể cho khách hàng.', '{{service_1}}  |  {{service_1_benefit}}\n{{service_2}}  |  {{service_2_benefit}}\n{{service_3}}  |  {{service_3_benefit}}'],
      ['Đội ngũ', 'Những con người giàu kinh nghiệm cùng chịu trách nhiệm cho kết quả chung.', '{{leader_1}} — {{role_1}}\n{{leader_2}} — {{role_2}}\n{{leader_3}} — {{role_3}}\nĐội ngũ liên chức năng gồm {{team_size}} chuyên gia'],
      ['Thông tin Liên hệ', 'Hãy cùng trao đổi về cơ hội hợp tác tiếp theo.', '{{company_name}}\n{{contact_email}}\n{{website}}\n{{office_address}}'],
    ],
  },
  {
    id: 7, slug: 'business-review', title: 'Đánh giá Kinh doanh theo Quý', name: 'Đánh giá kết quả kinh doanh theo quý', category: 'Kinh doanh',
    description: 'Bộ trình chiếu sáu trang tổng kết kinh doanh theo quý, gồm tóm tắt điều hành, chỉ số, doanh thu, kết quả nổi bật và ưu tiên quý tới.',
    slides: [
      ['Đánh giá Kinh doanh theo Quý', '{{reporting_period}}', '{{company_name}}  •  Ngày {{report_date}}  •  Người lập: {{prepared_by}}'],
      ['Tóm tắt Điều hành', 'Kết quả kinh doanh đạt và vượt các mục tiêu trọng yếu trong quý.', 'Doanh thu đạt {{total_revenue}}, tương đương {{revenue_attainment}} kế hoạch.\nTỷ lệ giữ chân khách hàng đạt {{retention_rate}}, cao hơn mục tiêu {{retention_target}}.\nĐộng lực tăng trưởng chính đến từ gia hạn thuê bao và mở rộng khách hàng hiện hữu.\nTrọng tâm cần cải thiện: rút ngắn chu kỳ chốt hợp đồng doanh nghiệp.'],
      ['Tổng quan Chỉ số', 'So sánh kết quả thực tế với mục tiêu quý đã được phê duyệt.', 'Doanh thu  {{total_revenue}}  |  Kế hoạch {{revenue_plan}}\nBiên lợi nhuận gộp  {{gross_margin}}  |  Kế hoạch {{gross_margin_plan}}\nKhách hàng mới  {{new_customers}}  |  Kế hoạch {{new_customers_plan}}\nTỷ lệ giữ chân  {{retention_rate}}  |  Kế hoạch {{retention_target}}'],
      ['Phân tích Doanh thu', 'Cơ cấu doanh thu cho thấy tăng trưởng đến từ cả thuê bao và dịch vụ.', 'Thuê bao                         {{subscription_revenue}}\nDịch vụ chuyên môn                {{services_revenue}}\nMở rộng khách hàng hiện hữu       {{expansion_revenue}}\nTổng doanh thu                    {{total_revenue}}\nTăng trưởng so với cùng kỳ: {{revenue_growth}}  •  Độ tin cậy dự báo: {{forecast_confidence}}'],
      ['Kết quả Nổi bật', 'Các sáng kiến trọng điểm tạo tác động rõ rệt trong quý.', 'Hoàn thành 120 hợp đồng khách hàng mới, vượt kế hoạch 10%.\nTỷ lệ giữ chân tăng từ 91% lên 94% nhờ chương trình chăm sóc chủ động.\nBiên lợi nhuận gộp đạt 48%, cao hơn kế hoạch 2 điểm phần trăm.\nPhản hồi khách hàng: thời gian hỗ trợ được cải thiện đáng kể.'],
      ['Ưu tiên Quý Tiếp theo', 'Ba ưu tiên gắn với bộ phận chịu trách nhiệm và mốc rà soát.', '1. Rút ngắn chu kỳ chốt hợp đồng — Phụ trách: Kinh doanh\n2. Mở rộng gia hạn tự động — Phụ trách: Sản phẩm và Vận hành\n3. Duy trì biên lợi nhuận gộp từ {{gross_margin}} — Phụ trách: Tài chính\nMốc đánh giá kết quả: {{next_review_date}}'],
    ],
  },
  {
    id: 8, slug: 'project-plan', title: 'Kế hoạch Triển khai Dự án', name: 'Kế hoạch triển khai dự án', category: 'Dự án',
    description: 'Bộ trình chiếu bảy trang về mục tiêu, phạm vi, tiến độ, phân công trách nhiệm, xử lý rủi ro và các bước tiếp theo của dự án.',
    slides: [
      ['Kế hoạch Triển khai Dự án', '{{project_name}}', 'Quản lý dự án: {{project_manager}}  •  {{plan_date}}'],
      ['Mục tiêu Dự án', 'Các kết quả dùng để xác định dự án triển khai thành công.', '{{goal_1}}\n{{goal_2}}\n{{goal_3}}\nTiêu chí thành công: {{success_measures}}'],
      ['Phạm vi và Giới hạn', 'Thống nhất kỳ vọng để hạn chế phát sinh ngoài dự kiến.', 'Trong phạm vi\n{{in_scope_1}}\n{{in_scope_2}}\nNgoài phạm vi\n{{out_of_scope_1}}\n{{out_of_scope_2}}'],
      ['Tiến độ Thực hiện', 'Kế hoạch theo giai đoạn với các mốc kiểm tra rõ ràng.', '01  Khảo sát và thống nhất     {{phase_1_dates}}\n02  Thiết kế và xây dựng          {{phase_2_dates}}\n03  Kiểm thử và ra mắt      {{phase_3_dates}}\nMốc quan trọng: {{key_milestone}}'],
      ['Phân công Trách nhiệm', 'Mỗi kết quả quan trọng đều có người chịu trách nhiệm.', 'Nhà tài trợ     {{sponsor_name}}  — quyết định và tháo gỡ vướng mắc\nQuản lý dự án     {{project_manager}}  — điều phối triển khai\nĐại diện nghiệp vụ     {{business_owner}}  — yêu cầu và nghiệm thu\nTrưởng nhóm kỹ thuật     {{technical_lead}}  — kiến trúc và chất lượng'],
      ['Rủi ro và Phương án', 'Chủ động xử lý bất định và rà soát thường xuyên.', '{{risk_1}}  |  {{risk_1_response}}  |  Phụ trách: {{risk_1_owner}}\n{{risk_2}}  |  {{risk_2_response}}  |  Phụ trách: {{risk_2_owner}}\n{{risk_3}}  |  {{risk_3_response}}  |  Phụ trách: {{risk_3_owner}}'],
      ['Các Bước Tiếp theo', 'Bắt đầu triển khai với các đầu việc thống nhất.', '1. Xác nhận phạm vi và người ra quyết định — {{due_1}}\n2. Công bố lịch làm việc và các mốc — {{due_2}}\n3. Họp khởi động và rà soát phụ thuộc — {{due_3}}\nMốc kiểm tra đầu tiên: {{checkpoint_date}}'],
    ],
  },
];

function addPptxSlide(pptx, data, index, total, accent, slug) {
  const slide = pptx.addSlide();
  const [rawTitle, rawSubtitle, rawBody, rawAltTitle, rawAltBody] = data;
  const [title, subtitle, body, altTitle, altBody] = [rawTitle, rawSubtitle, rawBody, rawAltTitle, rawAltBody]
    .map((value) => typeof value === 'string' ? translateTokens(value) : value);
  const navy = '142B3D';
  const muted = '52616D';
  const pale = 'F3F6F8';
  const white = 'FFFFFF';
  const dark = '17212B';
  const bodyLines = String(body ?? '').split('\n').filter(Boolean);
  const addText = (text, x, y, w, h, options = {}) => slide.addText(text, {
    x, y, w, h, fontFace: 'Aptos', fontSize: 15, color: dark,
    margin: 0, breakLine: false, valign: 'mid', fit: 'shrink',
    ...options,
  });
  const box = (x, y, w, h, fill = white, line = 'E0E5E9') => slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06, radius: 0.06,
    line: { color: line, width: 0.8 }, fill: { color: fill },
  });
  const line = (x, y, w, color = accent, width = 2) => slide.addShape(pptx.ShapeType.line, {
    x, y, w, h: 0, line: { color, width },
  });

  slide.background = { color: index === 0 ? navy : pale };
  if (index === 0) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.18, h: 7.5,
      line: { color: accent, transparency: 100 }, fill: { color: accent },
    });
    addText(slug === 'company-intro' ? 'HỒ SƠ DOANH NGHIỆP' : slug === 'business-review' ? 'BÁO CÁO ĐIỀU HÀNH' : 'HỒ SƠ DỰ ÁN', 0.82, 0.75, 5.6, 0.3, {
      fontSize: 11, bold: true, charSpacing: 2, color: 'FF8A52',
    });
    addText(title, 0.82, 1.7, 10.8, 1.25, {
      fontFace: 'Aptos Display', fontSize: 34, bold: true, color: white, valign: 'bottom',
    });
    line(0.84, 3.25, 1.15, accent, 4);
    addText(subtitle, 0.84, 3.55, 9.5, 0.7, { fontSize: 20, color: 'D9E2E8' });
    addText(body, 0.84, 4.72, 9.7, 0.62, { fontSize: 13, color: 'C5D0D8' });
    slide.addShape(pptx.ShapeType.rect, {
      x: 10.65, y: 0, w: 2.68, h: 7.5,
      line: { color: navy, transparency: 100 }, fill: { color: '1B3A50' },
    });
    addText(String(index + 1).padStart(2, '0'), 11.05, 5.8, 1.75, 0.9, {
      fontFace: 'Aptos Display', fontSize: 42, bold: true, color: accent, align: 'right',
    });
    addText('MẪU TRÌNH CHIẾU', 0.84, 6.85, 3.5, 0.22, { fontSize: 9, bold: true, charSpacing: 1.5, color: 'B9C5CD' });
    return slide;
  }

  addText(`${String(index + 1).padStart(2, '0')}  /  ${String(total).padStart(2, '0')}`, 11.55, 0.35, 0.95, 0.25, {
    fontSize: 9, bold: true, color: muted, align: 'right',
  });
  addText(title, 0.72, 0.42, 10.6, 0.58, {
    fontFace: 'Aptos Display', fontSize: 26, bold: true, color: navy,
  });
  addText(subtitle, 0.75, 1.12, 11.45, 0.48, { fontSize: 12, color: muted });
  line(0.75, 1.82, 11.8, 'D7DEE3', 0.8);

  if (slug === 'company-intro') {
    if (index === 1) {
      const metrics = bodyLines.slice(0, 4);
      metrics.forEach((text, i) => {
        const x = 0.76 + i * 3.02;
        box(x, 2.45, 2.72, 2.05);
        addText(`0${i + 1}`, x + 0.2, 2.65, 0.48, 0.3, { fontSize: 11, bold: true, color: accent });
        addText(text, x + 0.2, 3.12, 2.32, 1.05, { fontSize: 16, bold: true, color: navy, valign: 'top' });
      });
      addText('TỔNG QUAN', 0.8, 5.15, 2.2, 0.3, { fontSize: 10, bold: true, charSpacing: 1.4, color: accent });
      addText(subtitle, 0.8, 5.55, 10.6, 0.75, { fontSize: 20, bold: true, color: navy });
    } else if (index === 2) {
      [0, 1].forEach((i) => {
        const x = 0.78 + i * 6.03;
        box(x, 2.35, 5.65, 3.75, i === 0 ? navy : white, i === 0 ? navy : 'DCE2E7');
        addText(i === 0 ? subtitle : altTitle, x + 0.34, 2.72, 4.95, 0.48, {
          fontSize: 13, bold: true, color: i === 0 ? 'FF8A52' : accent,
        });
        addText(i === 0 ? body : altBody, x + 0.34, 3.5, 4.95, 2.15, {
          fontFace: 'Aptos Display', fontSize: 21, bold: true,
          color: i === 0 ? white : navy, valign: 'top',
        });
      });
    } else if (index === 3) {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const y = 2.25 + i * 1.3;
        box(0.8, y, 11.5, 1.05);
        addText(`0${i + 1}`, 1.1, y + 0.22, 0.6, 0.34, { fontSize: 15, bold: true, color: accent });
        addText(text, 1.95, y + 0.17, 9.85, 0.55, { fontSize: 17, bold: true, color: navy });
      });
    } else if (index === 4) {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const x = 0.8 + i * 3.88;
        box(x, 2.45, 3.52, 2.85, white);
        slide.addShape(pptx.ShapeType.ellipse, {
          x: x + 0.25, y: 2.78, w: 0.55, h: 0.55,
          line: { color: accent, transparency: 100 }, fill: { color: accent },
        });
        addText(`0${i + 1}`, x + 0.25, 2.87, 0.55, 0.2, { fontSize: 10, bold: true, color: white, align: 'center' });
        addText(text, x + 0.25, 3.62, 3.02, 1.25, { fontSize: 15, bold: true, color: navy, valign: 'top' });
      });
      addText(bodyLines[3] ?? '', 0.85, 5.75, 10.8, 0.45, { fontSize: 13, color: muted });
    } else {
      box(0.8, 2.35, 7.3, 3.85, navy, navy);
      addText(altTitle || 'LIÊN HỆ', 1.2, 2.75, 6.4, 0.35, { fontSize: 12, bold: true, charSpacing: 1.2, color: 'FF8A52' });
      addText(body, 1.2, 3.35, 6.4, 2.2, { fontSize: 18, bold: true, color: white, valign: 'top' });
      addText('CÙNG BẮT ĐẦU MỘT CUỘC TRAO ĐỔI', 8.65, 3.15, 3.4, 0.4, { fontSize: 10, bold: true, charSpacing: 0.8, color: accent });
      addText(subtitle, 8.65, 3.75, 3.5, 1.4, { fontFace: 'Aptos Display', fontSize: 21, bold: true, color: navy, valign: 'top' });
    }
  } else if (slug === 'business-review') {
    if (index === 1) {
      box(0.8, 2.32, 4.05, 3.8, navy, navy);
      addText('DOANH THU THỰC HIỆN', 1.15, 2.75, 3.3, 0.32, { fontSize: 10, bold: true, charSpacing: 1, color: 'FF8A52' });
      addText(bodyLines[0] ?? '', 1.15, 3.3, 3.35, 1.0, { fontFace: 'Aptos Display', fontSize: 24, bold: true, color: white });
      addText(bodyLines[1] ?? '', 1.15, 4.55, 3.3, 0.65, { fontSize: 13, color: 'D9E2E8' });
      addText('ĐIỂM NHẤN ĐIỀU HÀNH', 5.35, 2.45, 5.7, 0.35, { fontSize: 10, bold: true, charSpacing: 1, color: accent });
      bodyLines.slice(2).forEach((text, i) => {
        const y = 3.05 + i * 0.8;
        line(5.38, y + 0.47, 0.24, accent, 3);
        addText(text, 5.85, y, 6.1, 0.58, { fontSize: 14, color: dark, valign: 'top' });
      });
    } else if (index === 2) {
      bodyLines.slice(0, 4).forEach((text, i) => {
        const x = 0.78 + (i % 2) * 6.0;
        const y = 2.25 + Math.floor(i / 2) * 1.8;
        box(x, y, 5.55, 1.48);
        addText(`KPI 0${i + 1}`, x + 0.25, y + 0.2, 1.5, 0.25, { fontSize: 9, bold: true, charSpacing: 1, color: accent });
        addText(text, x + 0.25, y + 0.58, 5.05, 0.62, { fontSize: 17, bold: true, color: navy });
      });
      addText('Thực tế so với kế hoạch được duyệt', 0.85, 6.15, 6.5, 0.3, { fontSize: 11, color: muted });
    } else if (index === 3) {
      bodyLines.slice(0, 4).forEach((text, i) => {
        const y = 2.28 + i * 0.78;
        addText(text, 0.92, y, 3.2, 0.35, { fontSize: 13, bold: i === 3, color: i === 3 ? navy : muted });
        slide.addShape(pptx.ShapeType.rect, {
          x: 4.0, y: y + 0.04, w: i === 3 ? 5.9 : 3.7 + (i * 0.55), h: 0.24,
          line: { color: i === 3 ? navy : accent, transparency: 100 }, fill: { color: i === 3 ? navy : accent },
        });
      });
      box(10.3, 2.5, 2.0, 2.7, navy, navy);
      addText('TĂNG TRƯỞNG', 10.55, 2.9, 1.5, 0.45, { fontSize: 9, bold: true, color: 'FF8A52' });
      addText(bodyLines[4] ?? '', 10.55, 3.55, 1.5, 1.0, { fontSize: 13, bold: true, color: white });
      addText(bodyLines[5] ?? '', 0.95, 6.0, 10.8, 0.35, { fontSize: 12, color: muted });
    } else if (index === 4) {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const x = 0.8 + i * 3.88;
        box(x, 2.45, 3.52, 2.7, white);
        addText(`KẾT QUẢ 0${i + 1}`, x + 0.25, 2.78, 2.9, 0.25, { fontSize: 9, bold: true, charSpacing: 0.8, color: accent });
        addText(text, x + 0.25, 3.28, 2.95, 1.45, { fontSize: 15, bold: true, color: navy, valign: 'top' });
      });
      addText(bodyLines[3] ?? '', 0.9, 5.65, 10.8, 0.55, { fontSize: 13, color: muted });
    } else {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const y = 2.35 + i * 1.15;
        box(0.8, y, 11.5, 0.92);
        addText(`0${i + 1}`, 1.08, y + 0.2, 0.55, 0.36, { fontSize: 18, bold: true, color: accent });
        addText(text, 1.9, y + 0.16, 9.8, 0.48, { fontSize: 15, bold: true, color: navy });
      });
      addText(bodyLines[3] ?? '', 0.9, 6.05, 10.8, 0.35, { fontSize: 12, color: muted });
    }
  } else if (slug === 'project-plan') {
    if (index === 1) {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const x = 0.8 + i * 3.88;
        box(x, 2.42, 3.52, 2.25, i === 0 ? navy : white, i === 0 ? navy : 'E0E5E9');
        addText(`MỤC TIÊU 0${i + 1}`, x + 0.25, 2.75, 2.95, 0.3, { fontSize: 9, bold: true, charSpacing: 0.9, color: i === 0 ? 'FF8A52' : accent });
        addText(text, x + 0.25, 3.25, 2.95, 1.1, { fontSize: 15, bold: true, color: i === 0 ? white : navy, valign: 'top' });
      });
      box(0.8, 5.05, 11.28, 0.8, 'FFF0E9', 'FFF0E9');
      addText(`TIÊU CHÍ THÀNH CÔNG  •  ${bodyLines[3] ?? ''}`, 1.05, 5.25, 10.8, 0.35, { fontSize: 12, bold: true, color: navy });
    } else if (index === 2) {
      [0, 1].forEach((i) => {
        const x = 0.8 + i * 6.0;
        box(x, 2.4, 5.55, 3.75, i === 0 ? navy : white, i === 0 ? navy : 'E0E5E9');
        addText(i === 0 ? 'TRONG PHẠM VI' : 'NGOÀI PHẠM VI', x + 0.35, 2.8, 4.8, 0.35, { fontSize: 11, bold: true, charSpacing: 1, color: i === 0 ? 'FF8A52' : accent });
        const scopeLines = i === 0 ? bodyLines.slice(1, 3) : bodyLines.slice(4, 6);
        addText(scopeLines.map((text) => `•  ${text}`).join('\n'), x + 0.35, 3.45, 4.8, 1.85, { fontSize: 16, color: i === 0 ? white : navy, valign: 'top', breakLine: false });
      });
    } else if (index === 3) {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const x = 1.35 + i * 3.75;
        slide.addShape(pptx.ShapeType.ellipse, {
          x, y: 2.85, w: 0.52, h: 0.52,
          line: { color: accent, transparency: 100 }, fill: { color: accent },
        });
        addText(`0${i + 1}`, x, 3.0, 0.52, 0.2, { fontSize: 10, bold: true, color: white, align: 'center' });
        if (i < 2) line(x + 0.55, 3.11, 3.05, 'CFD7DE', 2);
        addText(text, x - 0.45, 3.75, 3.25, 0.78, { fontSize: 14, bold: true, color: navy, align: 'center', valign: 'top' });
      });
      box(0.95, 5.55, 11.2, 0.72, 'FFF0E9', 'FFF0E9');
      addText(bodyLines[3] ?? '', 1.2, 5.75, 10.7, 0.34, { fontSize: 12, bold: true, color: navy });
    } else if (index === 4) {
      bodyLines.slice(0, 4).forEach((text, i) => {
        const y = 2.22 + i * 0.9;
        box(0.8, y, 11.4, 0.68, i % 2 === 0 ? white : 'EDF1F4');
        addText(`0${i + 1}`, 1.08, y + 0.18, 0.48, 0.26, { fontSize: 11, bold: true, color: accent });
        addText(text, 1.82, y + 0.14, 9.9, 0.36, { fontSize: 13, color: navy });
      });
    } else if (index === 5) {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const x = 0.8 + i * 3.88;
        box(x, 2.48, 3.52, 2.6);
        addText(`RỦI RO 0${i + 1}`, x + 0.25, 2.8, 2.9, 0.25, { fontSize: 9, bold: true, charSpacing: 0.8, color: accent });
        addText(text, x + 0.25, 3.25, 2.92, 1.42, { fontSize: 13, bold: true, color: navy, valign: 'top' });
      });
      addText('Rà soát mức độ ảnh hưởng, người phụ trách và phương án giảm thiểu tại mỗi mốc dự án.', 0.85, 5.6, 10.9, 0.45, { fontSize: 12, color: muted });
    } else {
      bodyLines.slice(0, 3).forEach((text, i) => {
        const y = 2.35 + i * 1.05;
        addText(`0${i + 1}`, 0.95, y + 0.08, 0.6, 0.5, { fontSize: 23, bold: true, color: accent });
        line(1.8, y + 0.4, 0.38, 'CFD7DE', 1.5);
        addText(text, 2.35, y, 9.3, 0.58, { fontSize: 15, bold: true, color: navy });
      });
      box(0.9, 5.9, 11.15, 0.64, navy, navy);
      addText(bodyLines[3] ?? '', 1.2, 6.07, 10.5, 0.3, { fontSize: 12, bold: true, color: white });
    }
  }

  addText('PAPERTRAIL  •  MẪU CÓ THỂ TÙY CHỈNH', 0.76, 7.08, 6.5, 0.16, {
    fontSize: 7, bold: true, charSpacing: 0.8, color: muted,
  });
  return slide;
}

async function generateDoc(template) {
  const filePath = path.join(documentsDir, `${template.slug}.docx`);
  const buffer = await Packer.toBuffer(doc(template.title, template.description, template.content()));
  await writeFile(filePath, buffer);
  return filePath;
}

async function generatePresentation(template) {
  const filePath = path.join(presentationsDir, `${template.slug}.pptx`);
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Thư viện Mẫu Tài liệu';
  pptx.subject = template.description;
  pptx.title = template.title;
  pptx.company = 'Thư viện Mẫu Tài liệu';
  pptx.lang = 'vi-VN';
  pptx.theme = {
    headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'vi-VN',
  };
  const accent = palette.orange;
  template.slides.forEach((slideData, index) =>
    addPptxSlide(pptx, slideData, index, template.slides.length, accent, template.slug),
  );
  await pptx.writeFile({ fileName: filePath });
  return filePath;
}

function manifestEntry(template, type) {
  const isDoc = type === 'document';
  const relative = isDoc ? `documents/${template.slug}.docx` : `presentations/${template.slug}.pptx`;
  const requiredByTemplate = {
    'business-report': ['bao_cao_tieu_de', 'bao_cao_ky', 'cong_ty_ten', 'lap_boi'],
    resume: ['day_du_ten', 'email', 'dien_thoai', 'chuyen_mon_tieu_de'],
    'leave-request': ['nhan_vien_ten', 'phong_ban', 'nghi_phep_bat_dau_ngay', 'nghi_phep_ket_thuc_ngay', 'nghi_phep_ly_do'],
    'meeting-minutes': ['cuoc_hop_tieu_de', 'cuoc_hop_ngay', 'cuoc_hop_chu_tri', 'bien_ban_nguoi_ghi'],
    'project-proposal': ['du_an_ten', 'nha_tai_tro_ten', 'du_an_quan_ly'],
  };
  const requiredPresentationFields = {
    'company-intro': ['cong_ty_ten'],
    'business-review': ['bao_cao_ky', 'cong_ty_ten'],
    'project-plan': ['du_an_ten', 'du_an_quan_ly'],
  };
  const requiredFields = new Set(requiredByTemplate[template.slug] ?? []);
  const requiredPptFields = new Set(requiredPresentationFields[template.slug] ?? []);
  const presentationFields = isDoc ? [] : [...new Set(
    template.slides
      .flat()
      .join('\n')
      .matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g),
  )].map((match) => match[1]);
  const localizedPresentationFields = [...new Set(presentationFields.map(localizeToken))];
  return {
    id: template.id,
    slug: template.slug,
    name: template.name ?? template.title,
    type,
    category: template.category,
    description: template.description,
    filePath: relative,
    thumbnailPath: null,
    preview: isDoc
      ? {
        kind: 'outline', generatedFrom: 'nội dung mẫu', sections: template.preview,
        placeholders: [...new Set([...template.content.toString().matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => `{{${localizeToken(match[1])}}}`))],
        fields: [...new Map([...template.content.toString().matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => {
          const original = match[1];
          const key = localizeToken(original);
          const isLongText = /summary|description|analysis|notes|reason|plan|overview/i.test(original);
          return [key, {
            key,
            label: original.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
            required: requiredFields.has(key),
            maxLength: isLongText ? 2000 : 500,
            ...(original === 'email' || original.endsWith('_email') ? { type: 'email' } : {}),
            ...(isLongText ? { type: 'textarea' } : {}),
          }];
        })).values()],
      }
      : {
        kind: 'slide-outline',
        generatedFrom: 'nội dung mẫu',
        slideCount: template.slides.length,
        slides: template.previewSlides,
        slideFields: template.slides.map((slide) => [...new Set(
          slide.join('\n').matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g),
        )].map((match) => localizeToken(match[1]))),
        placeholders: localizedPresentationFields.map((key) => `{{${key}}}`),
        fields: localizedPresentationFields.map((key) => {
          const original = presentationFields.find((candidate) => localizeToken(candidate) === key) ?? key;
          const isLongText = /statement|benefit|address|markets|measures|response|scope|goal|service/i.test(original);
          return {
            key,
            label: original.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
            required: requiredPptFields.has(key),
            maxLength: isLongText ? 2000 : 500,
            ...(original.includes('email') ? { type: 'email' } : {}),
            ...(isLongText ? { type: 'textarea' } : {}),
          };
        }),
      },
  };
}

const allTemplates = [
  ...docs.map((template) => ({ ...template, type: 'document' })),
  ...pptTemplates.map((template) => ({
    ...template,
    type: 'presentation',
    previewSlides: template.slides.map(([title]) => title),
  })),
];

await Promise.all([mkdir(documentsDir, { recursive: true }), mkdir(presentationsDir, { recursive: true })]);
let failures = 0;
const generatedTemplates = documentsOnly
  ? allTemplates.filter((template) => template.type === 'document')
  : presentationsOnly
    ? allTemplates.filter((template) => template.type === 'presentation')
    : allTemplates;
for (const template of generatedTemplates) {
  try {
    const file = template.type === 'document'
      ? await generateDoc(template)
      : await generatePresentation(template);
    const result = await stat(file);
    console.log(`THÀNH CÔNG  ${path.relative(root, file)} (${result.size.toLocaleString()} byte)`);
  } catch (error) {
    failures += 1;
    console.error(`LỖI ${template.slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

let existing = [];
try {
  const current = JSON.parse(await readFile(manifestPath, 'utf8'));
  existing = Array.isArray(current.templates) ? current.templates : [];
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error(`Không thể đọc manifest hiện có: ${error.message}`);
    process.exitCode = 1;
  }
}

const replacements = new Map(generatedTemplates.map((template) => [template.id, manifestEntry(template, template.type)]));
const generatedIds = new Set(generatedTemplates.map((template) => template.id));
const generatedSlugs = new Set(generatedTemplates.map((template) => template.slug));
const preserved = existing.filter((entry) => !generatedIds.has(entry.id) && !generatedSlugs.has(entry.slug));
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  templates: [...preserved, ...replacements.values()].sort((a, b) => a.id - b.id),
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`THÀNH CÔNG  ${path.relative(root, manifestPath)} (${manifest.templates.length} mẫu)`);

const previewBuilder = spawnSync(
  'python3',
  [path.join(path.dirname(fileURLToPath(import.meta.url)), 'build-previews.py'), manifestPath],
  { stdio: 'inherit' },
);
if (previewBuilder.error || previewBuilder.status !== 0) {
  failures += 1;
  console.error(`Không thể tạo preview từ Office${previewBuilder.error ? `: ${previewBuilder.error.message}` : '.'}`);
}

const validation = spawnSync('python3', [path.join(path.dirname(fileURLToPath(import.meta.url)), 'validate-office.py'), '--manifest', manifestPath], { stdio: 'inherit' });
if (validation.error || validation.status !== 0) {
  failures += 1;
  console.error(`Kiểm tra cấu trúc Office OOXML thất bại${validation.error ? `: ${validation.error.message}` : '.'}`);
}

if (failures > 0) {
  console.error(`Quá trình tạo mẫu kết thúc với ${failures} lỗi.`);
  process.exitCode = 1;
} else {
  console.log(`Đã tạo thành công ${generatedTemplates.length} mẫu.`);
}
