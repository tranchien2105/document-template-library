type TemplateCopy = {
  name: string;
  description: string;
  category: string;
};

const templateCopy: Record<string, TemplateCopy> = {
  'business-report': {
    name: 'Báo cáo kết quả kinh doanh',
    description:
      'Mẫu báo cáo theo quý gồm tóm tắt điều hành, doanh thu, chi phí vận hành, lợi nhuận, chỉ số hiệu suất, rủi ro và kế hoạch hành động.',
    category: 'Kinh doanh',
  },
  resume: {
    name: 'Hồ sơ ứng tuyển',
    description:
      'Mẫu hồ sơ có thể chỉnh sửa, gồm thông tin liên hệ, mục tiêu nghề nghiệp, kỹ năng, kinh nghiệm, học vấn, dự án và chứng chỉ.',
    category: 'Nghề nghiệp',
  },
  'leave-request': {
    name: 'Đơn xin nghỉ phép',
    description:
      'Mẫu đơn nghỉ phép gồm thông tin nhân viên, thời gian nghỉ, lý do, kế hoạch bàn giao và phần phê duyệt.',
    category: 'Nhân sự',
  },
  'meeting-minutes': {
    name: 'Biên bản cuộc họp',
    description:
      'Mẫu biên bản ghi nhận người tham dự, chương trình, nội dung thảo luận, quyết định và công việc cần thực hiện.',
    category: 'Vận hành',
  },
  'project-proposal': {
    name: 'Đề xuất dự án',
    description:
      'Mẫu đề xuất dự án trình bày mục tiêu, phạm vi, tiến độ, ngân sách, sản phẩm bàn giao và phương án quản lý rủi ro.',
    category: 'Dự án',
  },
  'company-intro': {
    name: 'Giới thiệu công ty',
    description:
      'Bộ slide giới thiệu doanh nghiệp, sứ mệnh, tầm nhìn, sản phẩm dịch vụ, đội ngũ và thông tin liên hệ.',
    category: 'Doanh nghiệp',
  },
  'business-review': {
    name: 'Đánh giá kết quả kinh doanh theo quý',
    description:
      'Bộ slide tổng kết KPI, doanh thu, lợi nhuận, kết quả nổi bật và ưu tiên cho quý tiếp theo.',
    category: 'Kinh doanh',
  },
  'project-plan': {
    name: 'Kế hoạch triển khai dự án',
    description:
      'Bộ slide trình bày mục tiêu, phạm vi, tiến độ, phân công trách nhiệm, rủi ro và các bước tiếp theo.',
    category: 'Dự án',
  },
};

const fieldLabels: Record<string, string> = {
  'Report Title': 'Tiêu đề báo cáo',
  'Reporting Period': 'Kỳ báo cáo',
  'Company Name': 'Tên công ty',
  'Prepared By': 'Người lập báo cáo',
  'Total Revenue': 'Tổng doanh thu',
  'Operating Cost': 'Chi phí vận hành',
  'Net Profit': 'Lợi nhuận ròng',
  'Gross Margin': 'Biên lợi nhuận gộp',
  'Subscription Revenue': 'Doanh thu thuê bao',
  'Subscription Plan': 'Kế hoạch doanh thu thuê bao',
  'Services Revenue': 'Doanh thu dịch vụ',
  'Services Plan': 'Kế hoạch doanh thu dịch vụ',
  'Total Plan': 'Tổng kế hoạch',
  'Revenue Growth': 'Tăng trưởng doanh thu',
  'Revenue Growth Target': 'Mục tiêu tăng trưởng doanh thu',
  'Gross Margin Target': 'Mục tiêu biên lợi nhuận gộp',
  'Retention Rate': 'Tỷ lệ giữ chân khách hàng',
  'Retention Target': 'Mục tiêu giữ chân khách hàng',
  'Pipeline Coverage': 'Mức độ bao phủ cơ hội bán hàng',
  'Pipeline Target': 'Mục tiêu bao phủ cơ hội bán hàng',
  'Performance Analysis': 'Phân tích kết quả',
  'Risk 1': 'Rủi ro 1',
  'Risk Impact 1': 'Ảnh hưởng của rủi ro 1',
  'Mitigation Plan 1': 'Phương án giảm thiểu rủi ro 1',
  'Action Owner 1': 'Người phụ trách hành động 1',
  'Issue 1': 'Vấn đề 1',
  'Issue Impact 1': 'Ảnh hưởng của vấn đề 1',
  'Action Plan 1': 'Kế hoạch hành động 1',
  'Executive Owner': 'Người phụ trách điều hành',
  'Next Review Date': 'Ngày rà soát tiếp theo',
  'Full Name': 'Họ và tên',
  'Professional Title': 'Chức danh chuyên môn',
  City: 'Thành phố',
  Country: 'Quốc gia',
  Email: 'Email',
  Phone: 'Số điện thoại',
  'Portfolio Url': 'Đường dẫn hồ sơ năng lực',
  'Professional Summary': 'Tóm tắt chuyên môn',
  'Skill 1': 'Kỹ năng 1',
  'Skill 2': 'Kỹ năng 2',
  'Skill 3': 'Kỹ năng 3',
  'Skill 4': 'Kỹ năng 4',
  'Skill 5': 'Kỹ năng 5',
  'Job Title': 'Chức danh công việc',
  'Start Date': 'Ngày bắt đầu',
  'End Date': 'Ngày kết thúc',
  'Achievement 1': 'Thành tựu 1',
  'Achievement 2': 'Thành tựu 2',
  'Achievement 3': 'Thành tựu 3',
  'Previous Job Title': 'Chức danh công việc trước đây',
  'Previous Company': 'Công ty trước đây',
  'Previous Start Date': 'Ngày bắt đầu công việc trước đây',
  'Previous End Date': 'Ngày kết thúc công việc trước đây',
  'Previous Role Achievement': 'Thành tựu ở vai trò trước đây',
  Degree: 'Bằng cấp',
  Institution: 'Cơ sở đào tạo',
  'Graduation Year': 'Năm tốt nghiệp',
  'Project Name': 'Tên dự án',
  'Project Description': 'Mô tả dự án',
  'Project Technology Stack': 'Công nghệ sử dụng trong dự án',
  Certifications: 'Chứng chỉ',
  Languages: 'Ngôn ngữ',
  'Employee Name': 'Tên nhân viên',
  'Employee Id': 'Mã nhân viên',
  Department: 'Phòng ban',
  'Work Email': 'Email công việc',
  'Manager Name': 'Tên quản lý',
  'Leave Type': 'Loại nghỉ phép',
  'Number Of Days': 'Số ngày nghỉ',
  'Leave Start Date': 'Ngày bắt đầu nghỉ',
  'Leave End Date': 'Ngày kết thúc nghỉ',
  'Return Date': 'Ngày trở lại làm việc',
  'Emergency Contact': 'Thông tin liên hệ khẩn cấp',
  'Leave Reason': 'Lý do nghỉ phép',
  'Handover Plan': 'Kế hoạch bàn giao công việc',
  'Supporting Notes': 'Ghi chú bổ sung',
  'Employee Signature': 'Chữ ký nhân viên',
  'Employee Signed Date': 'Ngày nhân viên ký',
  'Manager Signature': 'Chữ ký quản lý',
  'Manager Decision Date': 'Ngày quản lý phê duyệt',
  'Hr Reviewer': 'Người phụ trách nhân sự',
  'Hr Signature': 'Chữ ký nhân sự',
  'Hr Decision Date': 'Ngày nhân sự phê duyệt',
  'Meeting Title': 'Tên cuộc họp',
  'Meeting Date': 'Ngày họp',
  'Meeting Location': 'Địa điểm họp',
  'Meeting Chair': 'Người chủ trì',
  'Minute Taker': 'Người ghi biên bản',
  'Next Meeting Date': 'Ngày họp tiếp theo',
  'Attendee List': 'Danh sách người tham dự',
  Apologies: 'Người vắng mặt',
  'Agenda Item 1': 'Nội dung chương trình 1',
  'Agenda Item 2': 'Nội dung chương trình 2',
  'Agenda Item 3': 'Nội dung chương trình 3',
  'Discussion Notes 1': 'Ghi chú thảo luận 1',
  'Discussion Notes 2': 'Ghi chú thảo luận 2',
  'Decision Summary': 'Tóm tắt quyết định',
  'Action 1': 'Công việc cần thực hiện 1',
  'Action Owner': 'Người phụ trách công việc',
  'Due Date': 'Hạn hoàn thành',
  'Action 2': 'Công việc cần thực hiện 2',
  'Action Owner 2': 'Người phụ trách công việc 2',
  'Due Date 2': 'Hạn hoàn thành 2',
  'Action 3': 'Công việc cần thực hiện 3',
  'Action Owner 3': 'Người phụ trách công việc 3',
  'Due Date 3': 'Hạn hoàn thành 3',
  'Sponsor Name': 'Tên đơn vị tài trợ',
  'Project Manager': 'Quản lý dự án',
  'Document Version': 'Phiên bản tài liệu',
  'Proposal Date': 'Ngày đề xuất',
  'Project Overview': 'Tổng quan dự án',
  'Business Problem': 'Vấn đề kinh doanh',
  'Target Audience': 'Đối tượng mục tiêu',
  'Objective 1': 'Mục tiêu 1',
  'Success Measure 1': 'Chỉ số thành công 1',
  'Objective 2': 'Mục tiêu 2',
  'Success Measure 2': 'Chỉ số thành công 2',
  'Objective 3': 'Mục tiêu 3',
  'Success Measure 3': 'Chỉ số thành công 3',
  'In Scope Items': 'Hạng mục trong phạm vi',
  'Out Of Scope Items': 'Hạng mục ngoài phạm vi',
  'Phase 1 Dates': 'Thời gian giai đoạn 1',
  'Phase 1 Output': 'Kết quả giai đoạn 1',
  'Phase 2 Dates': 'Thời gian giai đoạn 2',
  'Phase 2 Output': 'Kết quả giai đoạn 2',
  'Phase 3 Dates': 'Thời gian giai đoạn 3',
  'Phase 3 Output': 'Kết quả giai đoạn 3',
  'Target Start Date': 'Ngày bắt đầu dự kiến',
  'Target End Date': 'Ngày kết thúc dự kiến',
  'Deliverable 1': 'Sản phẩm bàn giao 1',
  'Deliverable 2': 'Sản phẩm bàn giao 2',
  'Deliverable 3': 'Sản phẩm bàn giao 3',
  'Estimated Budget': 'Ngân sách dự kiến',
  'Funding Owner': 'Người phụ trách nguồn vốn',
  'Risk 1 Impact': 'Mức độ ảnh hưởng của rủi ro 1',
  'Risk 1 Response': 'Phương án ứng phó rủi ro 1',
  'Risk 1 Owner': 'Người phụ trách rủi ro 1',
  'Risk 2': 'Rủi ro 2',
  'Risk 2 Impact': 'Mức độ ảnh hưởng của rủi ro 2',
  'Risk 2 Response': 'Phương án ứng phó rủi ro 2',
  'Risk 2 Owner': 'Người phụ trách rủi ro 2',
  'Key Assumption': 'Giả định chính',
  'Assumption Impact': 'Ảnh hưởng của giả định',
  'Assumption Validation Date': 'Ngày xác minh giả định',
  'Approval Decision': 'Quyết định phê duyệt',
  'Approval Date': 'Ngày phê duyệt',
  Audience: 'Đối tượng trình bày',
  'Presentation Date': 'Ngày trình bày',
  'Founded Year': 'Năm thành lập',
  Headquarters: 'Trụ sở chính',
  'Customer Count': 'Số lượng khách hàng',
  Markets: 'Thị trường trọng điểm',
  'Mission Statement': 'Tuyên bố sứ mệnh',
  'Vision Statement': 'Tuyên bố tầm nhìn',
  'Service 1': 'Dịch vụ 1',
  'Service 1 Benefit': 'Lợi ích dịch vụ 1',
  'Service 2': 'Dịch vụ 2',
  'Service 2 Benefit': 'Lợi ích dịch vụ 2',
  'Service 3': 'Dịch vụ 3',
  'Service 3 Benefit': 'Lợi ích dịch vụ 3',
  'Leader 1': 'Thành viên lãnh đạo 1',
  'Role 1': 'Vai trò 1',
  'Leader 2': 'Thành viên lãnh đạo 2',
  'Role 2': 'Vai trò 2',
  'Leader 3': 'Thành viên lãnh đạo 3',
  'Role 3': 'Vai trò 3',
  'Team Size': 'Quy mô đội ngũ',
  'Contact Email': 'Email liên hệ',
  Website: 'Trang web',
  'Office Address': 'Địa chỉ văn phòng',
  'Report Date': 'Ngày báo cáo',
  'Revenue Attainment': 'Tỷ lệ hoàn thành kế hoạch doanh thu',
  'Revenue Plan': 'Kế hoạch doanh thu',
  'Gross Margin Plan': 'Kế hoạch biên lợi nhuận gộp',
  'New Customers': 'Số khách hàng mới',
  'New Customers Plan': 'Kế hoạch khách hàng mới',
  'Expansion Revenue': 'Doanh thu mở rộng khách hàng',
  'Forecast Confidence': 'Độ tin cậy dự báo',
  'Goal 1': 'Mục tiêu 1',
  'Goal 2': 'Mục tiêu 2',
  'Goal 3': 'Mục tiêu 3',
  'Success Measures': 'Tiêu chí thành công',
  'In Scope 1': 'Hạng mục trong phạm vi 1',
  'In Scope 2': 'Hạng mục trong phạm vi 2',
  'Out Of Scope 1': 'Hạng mục ngoài phạm vi 1',
  'Out Of Scope 2': 'Hạng mục ngoài phạm vi 2',
  'Key Milestone': 'Mốc quan trọng',
  'Business Owner': 'Đại diện nghiệp vụ',
  'Technical Lead': 'Trưởng nhóm kỹ thuật',
  'Risk 3': 'Rủi ro 3',
  'Risk 3 Response': 'Phương án ứng phó rủi ro 3',
  'Risk 3 Owner': 'Người phụ trách rủi ro 3',
  'Due 1': 'Hạn công việc 1',
  'Due 2': 'Hạn công việc 2',
  'Due 3': 'Hạn công việc 3',
  'Checkpoint Date': 'Ngày kiểm tra tiến độ',
};

export function getTemplateCopy(slug: string) {
  return templateCopy[slug];
}

export function translateCategory(category: string) {
  const categories: Record<string, string> = {
    Business: 'Kinh doanh',
    Career: 'Nghề nghiệp',
    'Human Resources': 'Nhân sự',
    Operations: 'Vận hành',
    Company: 'Doanh nghiệp',
    'Project Management': 'Quản lý dự án',
  };

  return categories[category] ?? category;
}

export function translateFieldLabel(label: string) {
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const uploadedVietnameseLabels: Record<string, string> = {
    ten_cong_ty: 'Tên công ty',
    nguoi_trinh_bay: 'Người trình bày',
    ngay_trinh_bay: 'Ngày trình bày',
    linh_vuc_hoat_dong: 'Lĩnh vực hoạt động',
    nam_thanh_lap: 'Năm thành lập',
    dia_chi_tru_so: 'Địa chỉ trụ sở',
    quy_mo_doi_ngu: 'Quy mô đội ngũ',
    thi_truong_phuc_vu: 'Thị trường phục vụ',
    su_menh: 'Sứ mệnh',
    nam_tam_nhin: 'Năm tầm nhìn',
    tam_nhin: 'Tầm nhìn',
    gia_tri_cot_loi: 'Giá trị cốt lõi',
    san_pham_dich_vu_1: 'Sản phẩm, dịch vụ 1',
    san_pham_dich_vu_2: 'Sản phẩm, dịch vụ 2',
    san_pham_dich_vu_3: 'Sản phẩm, dịch vụ 3',
    loi_ich_1: 'Lợi ích 1',
    loi_ich_2: 'Lợi ích 2',
    loi_ich_3: 'Lợi ích 3',
    cam_ket_chat_luong: 'Cam kết chất lượng',
    nguoi_dai_dien: 'Người đại diện',
    nang_luc_chuyen_mon: 'Năng lực chuyên môn',
    kinh_nghiem_noi_bat: 'Kinh nghiệm nổi bật',
    doi_tac_tieu_bieu: 'Đối tác tiêu biểu',
    dia_chi_lien_he: 'Địa chỉ liên hệ',
    so_dien_thoai: 'Số điện thoại',
    email_lien_he: 'Email liên hệ',
    trang_web: 'Trang web',
  };

  return fieldLabels[label] ?? uploadedVietnameseLabels[normalized] ?? label;
}

export function getSampleValue(
  slug: string,
  fieldKey: string,
  label: string,
  fieldType?: string,
) {
  const requiredExamples: Record<string, Record<string, string>> = {
    'business-report': {
      bao_cao_tieu_de: 'Báo cáo kết quả kinh doanh Quý III/2026',
      bao_cao_ky: 'Quý III năm 2026',
      cong_ty_ten: 'Công ty Công nghệ Minh An',
      lap_boi: 'Nguyễn Minh An',
    },
    resume: {
      day_du_ten: 'Nguyễn Minh An',
      email: 'minh.an@example.com',
      dien_thoai: '0901 234 567',
      chuyen_mon_tieu_de: 'Chuyên viên phân tích nghiệp vụ',
    },
    'leave-request': {
      nhan_vien_ten: 'Nguyễn Minh An',
      phong_ban: 'Phòng Công nghệ',
      nghi_phep_bat_dau_ngay: '02/11/2026',
      nghi_phep_ket_thuc_ngay: '03/11/2026',
      nghi_phep_ly_do: 'Giải quyết việc gia đình',
    },
    'meeting-minutes': {
      cuoc_hop_tieu_de: 'Họp rà soát kế hoạch quý IV',
      cuoc_hop_ngay: '01/10/2026',
      cuoc_hop_chu_tri: 'Trần Thu Hà',
      bien_ban_nguoi_ghi: 'Nguyễn Minh An',
    },
    'project-proposal': {
      du_an_ten: 'Dự án số hóa quy trình nội bộ',
      nha_tai_tro_ten: 'Công ty Công nghệ Minh An',
      du_an_quan_ly: 'Trần Thu Hà',
    },
    'company-intro': {
      doi_tuong: 'Ban lãnh đạo và đối tác',
      trinh_chieu_ngay: '30/10/2026',
      cong_ty_ten: 'Công ty Công nghệ Minh An',
      thanh_lap_nam: '2018',
      tru_so: 'Thành phố Hồ Chí Minh',
      khach_hang_so_luong: 'Hơn 1.200 khách hàng',
      thi_truong: 'Việt Nam và Đông Nam Á',
      su_menh_tuyen_bo: 'Giúp doanh nghiệp vận hành hiệu quả hơn bằng công nghệ dễ tiếp cận.',
      tam_nhin_tuyen_bo: 'Trở thành đối tác công nghệ đáng tin cậy của doanh nghiệp Việt.',
      dich_vu_1: 'Tư vấn chuyển đổi số',
      dich_vu_1_loi_ich: 'Lộ trình triển khai rõ ràng, phù hợp nguồn lực.',
      dich_vu_2: 'Phát triển phần mềm',
      dich_vu_2_loi_ich: 'Sản phẩm được thiết kế theo quy trình thực tế.',
      dich_vu_3: 'Hỗ trợ vận hành',
      dich_vu_3_loi_ich: 'Đồng hành liên tục sau khi bàn giao.',
      lanh_dao_1: 'Trần Thu Hà',
      vai_tro_1: 'Tổng giám đốc',
      lanh_dao_2: 'Nguyễn Minh An',
      vai_tro_2: 'Giám đốc công nghệ',
      lanh_dao_3: 'Lê Hoàng Nam',
      vai_tro_3: 'Giám đốc vận hành',
      doi_ngu_quy_mo: '45',
      lien_he_email: 'lienhe@example.com',
      trang_web: 'https://example.com',
      van_phong_dia_chi: 'Quận 1, Thành phố Hồ Chí Minh',
    },
    'business-review': {
      bao_cao_ky: 'Quý III năm 2026',
      cong_ty_ten: 'Công ty Công nghệ Minh An',
      lap_boi: 'Nguyễn Minh An',
      bao_cao_ngay: '30/09/2026',
      tong_doanh_thu: '12,0 tỷ đồng',
      doanh_thu_muc_dat: '106,7%',
      giu_chan_ty_le: '94%',
      giu_chan_muc_tieu: '92%',
      doanh_thu_ke_hoach: '11,25 tỷ đồng',
      bien_loi_nhuan_gop: '48%',
      gop_bien_ke_hoach: '46%',
      moi_khach_hang: '120',
      moi_khach_hang_ke_hoach: '110',
      doanh_thu_thue_bao: '7,2 tỷ đồng',
      doanh_thu_dich_vu: '3,3 tỷ đồng',
      mo_rong_doanh_thu: '1,5 tỷ đồng',
      doanh_thu_tang_truong: '18%',
      du_bao_do_tin_cay: '85%',
      tiep_theo_ra_soat_ngay: '15/01/2027',
    },
    'project-plan': {
      du_an_ten: 'Dự án số hóa quy trình nội bộ',
      du_an_quan_ly: 'Trần Thu Hà',
      ke_hoach_ngay: '30/10/2026',
      muc_tieu_1: 'Rút ngắn 30% thời gian xử lý yêu cầu nội bộ.',
      muc_tieu_2: 'Chuẩn hóa dữ liệu trên một nền tảng dùng chung.',
      muc_tieu_3: 'Đưa giải pháp vào vận hành trong quý I/2027.',
      thanh_cong_cac_chi_so: 'Thời gian xử lý giảm 30%, mức độ sử dụng đạt trên 85%.',
      trong_pham_vi_1: 'Khảo sát và thiết kế quy trình.',
      trong_pham_vi_2: 'Xây dựng, kiểm thử và đào tạo người dùng.',
      ngoai_cua_pham_vi_1: 'Thay thế hệ thống kế toán hiện tại.',
      ngoai_cua_pham_vi_2: 'Tích hợp với nền tảng chưa được phê duyệt.',
      giai_doan_1_ngay: 'Tháng 11/2026',
      giai_doan_2_ngay: 'Tháng 12/2026',
      giai_doan_3_ngay: 'Tháng 01/2027',
      trong_yeu_cot_moc: 'Nghiệm thu vận hành ngày 31/01/2027.',
      nha_tai_tro_ten: 'Công ty Công nghệ Minh An',
      kinh_doanh_phu_trach: 'Lê Hoàng Nam',
      ky_thuat_truong_nhom: 'Phạm Quốc Bảo',
      rui_ro_1: 'Chậm bàn giao dữ liệu từ các phòng ban.',
      rui_ro_1_ung_pho: 'Chốt đầu mối và lịch bàn giao ngay từ đầu.',
      rui_ro_1_phu_trach: 'Quản lý dự án',
      rui_ro_2: 'Người dùng chưa quen với quy trình mới.',
      rui_ro_2_ung_pho: 'Tổ chức hướng dẫn và hỗ trợ theo nhóm.',
      rui_ro_2_phu_trach: 'Đại diện nghiệp vụ',
      rui_ro_3: 'Phát sinh yêu cầu ngoài phạm vi.',
      rui_ro_3_ung_pho: 'Đánh giá tác động trước khi phê duyệt.',
      rui_ro_3_phu_trach: 'Nhà tài trợ dự án',
      han_1: '05/11/2026',
      han_2: '10/11/2026',
      han_3: '15/11/2026',
      moc_kiem_tra_ngay: '30/11/2026',
    },
  };

  const example = requiredExamples[slug]?.[fieldKey];
  if (example) return example;

  const key = fieldKey.toLocaleLowerCase('vi-VN');
  const fieldLabel = translateFieldLabel(label).toLocaleLowerCase('vi-VN');

  if (key.includes('email') || fieldType === 'email') {
    return 'minh.an@example.com';
  }
  if (key.includes('dien_thoai') || key.includes('phone')) {
    return '0901 234 567';
  }
  if (key.includes('duong_dan') || key.includes('url')) {
    return 'https://example.com/ho-so';
  }
  if (key.includes('ngay') || key.includes('date')) {
    return '01/11/2026';
  }
  if (key.includes('nam') || key.includes('year')) return '2026';
  if (key.includes('so_ngay') || key.includes('number_of_days')) {
    return '02 ngày';
  }
  if (/(doanh_thu|chi_phi|loi_nhuan|ngan_sach|revenue|cost|budget)/.test(key)) {
    return '120.000.000 VNĐ';
  }
  if (key.includes('cong_ty') || key.includes('company')) {
    return 'Công ty Công nghệ Minh An';
  }
  if (key.includes('quan_ly') || key.includes('manager')) return 'Trần Thu Hà';
  if (key.includes('du_an') || key.includes('project')) {
    return 'Dự án số hóa quy trình nội bộ';
  }
  if (key.includes('ten') || key.includes('name')) return 'Nguyễn Minh An';
  if (key.includes('phong_ban') || key.includes('department')) {
    return 'Phòng Công nghệ';
  }
  if (key.includes('chuc_danh') || key.includes('title')) {
    return 'Chuyên viên phân tích nghiệp vụ';
  }
  if (key.includes('ky_nang') || key.includes('skill')) {
    return 'Phân tích dữ liệu, giao tiếp, quản lý dự án';
  }
  if (/(thanh_tuu|achievement|hanh_dong|action|ban_giao|deliverable)/.test(key)) {
    return 'Hoàn thành đúng tiến độ, cải thiện hiệu suất 20%.';
  }
  if (/(rui_ro|risk)/.test(key)) return 'Chậm tiến độ do phụ thuộc nhà cung cấp.';
  if (/(ung_pho|response|ke_hoach|plan)/.test(key)) {
    return 'Rà soát hằng tuần và chuẩn bị phương án dự phòng.';
  }
  if (
    fieldType === 'textarea' ||
    /(mo_ta|description|tom_tat|summary|ghi_chu|notes)/.test(key)
  ) {
    return `Nội dung minh họa cho mục ${fieldLabel}.`;
  }

  return `Ví dụ ${fieldLabel}`;
}
