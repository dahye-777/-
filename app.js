// 초기 상태 및 유틸
const REQUIRED_COLUMNS = [
  '구분','서비스 상품','제목','내용','학원명','학원코드','처리상태','작성일'
];

// TODO: 컬럼명 매핑이 필요한 경우 이 객체에서 변경
const COLUMN_MAP = {
  type: '구분',
  service: '서비스 상품',
  title: '제목',
  content: '내용',
  academyName: '학원명',
  academyCode: '학원코드',
  status: '처리상태',
  date: '작성일'
};

const state = {
  rows: [], // 원본
  filteredRows: [], // 검색/필터 반영
  pagedRows: [],
  page: 1,
  pageSize: 25,
  charts: {
    type: null,
    status: null,
    service: null,
    trend: null
  },
  trendMonthly: false,
  debounceTimer: null
};

function showToast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 2500);
}

function showModal(rowData) {
  const modal = document.getElementById('modal');
  
  if (!modal) {
    console.error('모달 요소를 찾을 수 없습니다');
    return;
  }
  
  // 4개 컬럼 데이터 설정
  document.getElementById('modal-type').textContent = rowData[COLUMN_MAP.type] || '-';
  document.getElementById('modal-service').textContent = rowData[COLUMN_MAP.service] || '-';
  document.getElementById('modal-title').textContent = rowData[COLUMN_MAP.title] || '-';
  document.getElementById('modal-content').textContent = rowData[COLUMN_MAP.content] || '-';
  
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // 스크롤 방지
  console.log('모달 열기 완료');
}

function hideModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // 스크롤 복원
    console.log('모달 닫기 완료');
  } else {
    console.error('모달 요소를 찾을 수 없습니다');
  }
}

function isValidRequiredColumns(header) {
  const missing = REQUIRED_COLUMNS.filter(col => !header.includes(col));
  return { ok: missing.length === 0, missing };
}

function normalizeDate(value) {
  if (value === null || value === undefined) return null;
  
  const str = String(value).trim();
  
  // 앞 8자리만 추출 (yyyymmdd 형태)
  const yyyymmdd = str.substring(0, 8);
  const ymd = yyyymmdd.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m}-${d}`;
  }
  
  // SheetJS가 날짜를 Date로 파싱한 경우
  if (value instanceof Date && !isNaN(value)) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // 기타 날짜 형태 시도
  const date = new Date(str.replace(/\./g, '-').replace(/\//g, '-'));
  if (!isNaN(date)) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  return null; // 파싱 실패
}

function renderTable(tableId, rows, columns, options = {}) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';
  const limited = options.limit ? rows.slice(0, options.limit) : rows;
  const format = (v) => (v === null || v === undefined || v === '') ? '-' : String(v);
  for (const r of limited) {
    const tr = document.createElement('tr');
    for (const c of columns) {
      const td = document.createElement('td');
      const val = r[c] ?? r[COLUMN_MAP[c]] ?? '-';
      const text = c === '작성일' || c === COLUMN_MAP.date ? (format(r[COLUMN_MAP.date])) : format(val);
      td.textContent = text;
      if (['제목','내용'].includes(c) || ['title','content'].includes(c)) td.classList.add('truncate');
      
      // 더블클릭 이벤트 추가
      td.addEventListener('dblclick', () => {
        showModal(r);
      });
      
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function paginate(rows, page, pageSize) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;
  const end = start + pageSize;
  return { slice: rows.slice(start, end), total, totalPages, current };
}

function updatePagination() {
  const { slice, total, totalPages, current } = paginate(state.filteredRows, state.page, state.pageSize);
  state.pagedRows = slice;
  document.getElementById('page-info').textContent = `${current} / ${totalPages}`;
  document.getElementById('list-count').textContent = `${total}건`;
  renderTable('main-table', state.pagedRows, REQUIRED_COLUMNS);
}

function buildSetsFromRows(rows) {
  const setType = new Set();
  const setService = new Set();
  const setStatus = new Set();
  for (const r of rows) {
    if (r[COLUMN_MAP.type]) setType.add(r[COLUMN_MAP.type]);
    if (r[COLUMN_MAP.service]) setService.add(r[COLUMN_MAP.service]);
    if (r[COLUMN_MAP.status]) setStatus.add(r[COLUMN_MAP.status]);
  }
  return { setType, setService, setStatus };
}

function fillFilterOptions() {
  const { setType, setService, setStatus } = buildSetsFromRows(state.rows);
  const fill = (id, values) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    Array.from(values).sort().forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      el.appendChild(opt);
    });
  };
  fill('filter-type', setType);
  fill('filter-service', setService);
  fill('filter-status', setStatus);
}

function applySearch() {
  const keyword = document.getElementById('search-input').value.trim().toLowerCase();
  if (!keyword) {
    state.filteredRows = [...state.rows];
    state.page = 1;
    updatePagination();
    return;
  }
  const targets = [COLUMN_MAP.title, COLUMN_MAP.content, COLUMN_MAP.academyName];
  state.filteredRows = state.rows.filter(r =>
    targets.some(k => String(r[k] ?? '').toLowerCase().includes(keyword))
  );
  state.page = 1;
  updatePagination();
}

function getSelectedValues(selectId) {
  const options = Array.from(document.getElementById(selectId).selectedOptions);
  return options.map(o => o.value);
}

function applyFilter() {
  const selType = getSelectedValues('filter-type');
  const selService = getSelectedValues('filter-service');
  const selStatus = getSelectedValues('filter-status');
  const hasCode = document.getElementById('filter-has-code').checked;

  const filtered = state.rows.filter(r => {
    const condType = selType.length ? selType.includes(r[COLUMN_MAP.type]) : true;
    const condService = selService.length ? selService.includes(r[COLUMN_MAP.service]) : true;
    const condStatus = selStatus.length ? selStatus.includes(r[COLUMN_MAP.status]) : true;
    const condCode = hasCode ? !!(r[COLUMN_MAP.academyCode] && String(r[COLUMN_MAP.academyCode]).trim()) : true;
    return condType && condService && condStatus && condCode;
  });

  document.getElementById('filter-count').textContent = `${filtered.length}건`;
  renderTable('filter-table', filtered, [
    COLUMN_MAP.type,
    COLUMN_MAP.service,
    COLUMN_MAP.title,
    COLUMN_MAP.content,
    COLUMN_MAP.academyName,
    COLUMN_MAP.academyCode,
    COLUMN_MAP.status,
    COLUMN_MAP.date
  ]);
}

// 차트 유틸
function ensureChart(ctx, prev, type, data, options) {
  if (prev) prev.destroy();
  // TODO: 차트 컬러 팔레트 커스터마이즈
  return new Chart(ctx, { type, data, options });
}

// Stats 탭용 함수들
function fillStatsSelectOptions() {
  if (state.rows.length === 0) return;
  
  // 구분 옵션 채우기
  const typeSet = new Set();
  const serviceSet = new Set();
  
  state.rows.forEach(row => {
    if (row[COLUMN_MAP.type]) {
      typeSet.add(row[COLUMN_MAP.type]);
    }
    if (row[COLUMN_MAP.service]) {
      serviceSet.add(row[COLUMN_MAP.service]);
    }
  });
  
  // 구분 select 채우기
  const typeSelect = document.getElementById('type-select');
  typeSelect.innerHTML = '<option value="">전체</option>';
  Array.from(typeSet).sort().forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });
  
  // 서비스상품 select 채우기
  const serviceSelect = document.getElementById('service-select');
  serviceSelect.innerHTML = '<option value="">전체</option>';
  Array.from(serviceSet).sort().forEach(service => {
    const option = document.createElement('option');
    option.value = service;
    option.textContent = service;
    serviceSelect.appendChild(option);
  });
}

function parseDateForStats(value) {
  if (value === null || value === undefined) return null;
  
  const str = String(value).trim();
  
  // 앞 8자리만 추출 (yyyymmdd 형태)
  const yyyymmdd = str.substring(0, 8);
  const ymd = yyyymmdd.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return { year: parseInt(y), month: parseInt(m), day: parseInt(d) };
  }
  
  // SheetJS가 날짜를 Date로 파싱한 경우
  if (value instanceof Date && !isNaN(value)) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate()
    };
  }
  
  // yyyy-mm-dd 형태
  const dateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    return { year: parseInt(y), month: parseInt(m), day: parseInt(d) };
  }
  
  return null; // 파싱 실패
}

function applyStatsFilters() {
  if (state.rows.length === 0) {
    document.getElementById('result-box').textContent = '엑셀 파일을 먼저 업로드하세요.';
    return;
  }
  
  // 필터 조건 가져오기
  const year = document.getElementById('year-input').value;
  const month = document.getElementById('month-input').value;
  const day = document.getElementById('day-input').value;
  const type = document.getElementById('type-select').value;
  const service = document.getElementById('service-select').value;
  
  // 필터링된 데이터
  let filteredRows = state.rows.filter(row => {
    // 날짜 필터
    if (year || month || day) {
      const dateInfo = parseDateForStats(row[COLUMN_MAP.date]);
      if (!dateInfo) return false; // 날짜 파싱 실패 시 제외
      
      if (year && dateInfo.year !== parseInt(year)) return false;
      if (month && dateInfo.month !== parseInt(month)) return false;
      if (day && dateInfo.day !== parseInt(day)) return false;
    }
    
    // 구분 필터
    if (type && row[COLUMN_MAP.type] !== type) return false;
    
    // 서비스상품 필터
    if (service && row[COLUMN_MAP.service] !== service) return false;
    
    return true;
  });
  
  // 결과 출력
  const count = filteredRows.length;
  const resultBox = document.getElementById('result-box');
  
  if (count === 0) {
    resultBox.textContent = '선택한 조건에 해당하는 데이터가 없습니다.';
  } else {
    resultBox.textContent = `선택한 조건에 해당하는 건수는 총 ${count}건 입니다.`;
  }
}

function resetStatsFilters() {
  document.getElementById('year-input').value = '';
  document.getElementById('month-input').value = '';
  document.getElementById('day-input').value = '';
  document.getElementById('type-select').value = '';
  document.getElementById('service-select').value = '';
  document.getElementById('result-box').textContent = '엑셀 파일을 업로드하고 조건을 설정한 후 "Stats 조회" 버튼을 클릭하세요.';
}


function renderTrendChart() {
  const rows = state.rows;
  const m = new Map();
  for (const r of rows) {
    const d = r[COLUMN_MAP.date];
    if (!d) continue;
    const key = state.trendMonthly ? d.slice(0,7) : d; // yyyy-mm
    m.set(key, (m.get(key) || 0) + 1);
  }
  const labels = Array.from(m.keys()).sort();
  const values = labels.map(k => m.get(k));

  document.getElementById('empty-trend').hidden = labels.length > 0;
  state.charts.trend = ensureChart(document.getElementById('trend-chart'), state.charts.trend, 'line', {
    labels,
    datasets: [{ label: state.trendMonthly ? '월별 건수' : '일별 건수', data: values, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.2)', tension: 0.2 }]
  }, { responsive: true, scales: { x: { ticks: { color: '#cbd5e1' } }, y: { ticks: { color: '#cbd5e1' } } } });
}

function onExcelFileChange(file) {
  if (!file) return;
  
  // XLSX 라이브러리 로드 확인
  if (typeof XLSX === 'undefined') {
    showToast('엑셀 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      console.log('파일 읽기 시작:', file.name);
      
      const data = new Uint8Array(e.target.result);
      console.log('파일 크기:', data.length, 'bytes');
      
      const wb = XLSX.read(data, { type: 'array' });
      console.log('워크북 시트:', wb.SheetNames);
      
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        showToast('엑셀 파일에 시트가 없습니다.');
        return;
      }
      
      const ws = wb.Sheets[wb.SheetNames[0]];
      console.log('첫 번째 시트 선택:', wb.SheetNames[0]);
      
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      console.log('JSON 변환 완료, 행 수:', json.length);
      
      if (!json.length) {
        state.rows = [];
        state.filteredRows = [];
        updateAll();
        showToast('엑셀에 데이터가 없습니다.');
        return;
      }
      
      const header = Object.keys(json[0]);
      console.log('엑셀 헤더:', header);
      console.log('첫 번째 행:', json[0]);
      
      // 구분 컬럼의 모든 고유값 확인
      const allTypes = [...new Set(json.map(r => r[COLUMN_MAP.type]).filter(v => v && String(v).trim()))];
      console.log('엑셀의 모든 구분 값들:', allTypes);
      
      // 각 구분 값의 건수 확인
      const typeCounts = {};
      json.forEach(r => {
        const type = r[COLUMN_MAP.type];
        if (type && String(type).trim()) {
          const trimmedType = String(type).trim();
          typeCounts[trimmedType] = (typeCounts[trimmedType] || 0) + 1;
        }
      });
      console.log('각 구분별 건수:', typeCounts);
      
      const { ok, missing } = isValidRequiredColumns(header);
      if (!ok) {
        showToast(`누락 컬럼: ${missing.join(', ')}`);
        console.log('누락된 컬럼:', missing);
      }

      // 행 매핑 + 날짜 정규화
      state.rows = json.map(r => {
        const row = { ...r };
        const normalizedDate = normalizeDate(r[COLUMN_MAP.date]);
        row[COLUMN_MAP.date] = normalizedDate;
        return row;
      });
      
      console.log('처리된 첫 번째 행:', state.rows[0]);
      state.filteredRows = [...state.rows];
      state.page = 1;
      updateAll();
      fillStatsSelectOptions(); // Stats 탭 select 옵션 채우기
      showToast('로드 완료. 모든 탭 갱신됨');
      
    } catch (err) {
      console.error('엑셀 파일 읽기 오류:', err);
      console.error('오류 스택:', err.stack);
      showToast(`파일을 읽는 중 오류가 발생했습니다: ${err.message}`);
    }
  };
  
  reader.onerror = (e) => {
    console.error('파일 읽기 실패:', e);
    showToast('파일을 읽을 수 없습니다.');
  };
  
  reader.readAsArrayBuffer(file);
}

function updateAll() {
  updatePagination();
  fillFilterOptions();
  applyFilter();
  renderTrendChart();
}

function setupEvents() {
  // 탭 전환
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(target).classList.add('active');
    });
  });

  // 업로드
  const excelInput = document.getElementById('excel-input');
  excelInput.addEventListener('change', (e) => onExcelFileChange(e.target.files[0]));

  // 검색 버튼 + 디바운스(클릭 시에도 300ms 지연 후 실행)
  const searchBtn = document.getElementById('search-btn');
  searchBtn.addEventListener('click', () => {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(applySearch, 300);
  });

  // 페이지네이션
  document.getElementById('prev-page').addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1);
    updatePagination();
  });
  document.getElementById('next-page').addEventListener('click', () => {
    const { totalPages } = paginate(state.filteredRows, state.page, state.pageSize);
    state.page = Math.min(totalPages, state.page + 1);
    updatePagination();
  });
  document.getElementById('page-size').addEventListener('change', (e) => {
    state.pageSize = Number(e.target.value);
    state.page = 1;
    updatePagination();
  });

  // 필터 즉시 반영
  ['filter-type','filter-service','filter-status','filter-has-code'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilter);
  });
  document.getElementById('filter-reset').addEventListener('click', () => {
    ['filter-type','filter-service','filter-status'].forEach(id => {
      const el = document.getElementById(id);
      Array.from(el.options).forEach(o => o.selected = false);
    });
    document.getElementById('filter-has-code').checked = false;
    applyFilter();
  });

  // 트렌드 토글
  document.getElementById('trend-toggle').addEventListener('change', (e) => {
    state.trendMonthly = e.target.checked;
    renderTrendChart();
  });

  // Stats 탭 이벤트
  document.getElementById('stats-btn').addEventListener('click', applyStatsFilters);

  // 모달 이벤트
  const modalClose = document.getElementById('modal-close');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modal = document.getElementById('modal');
  
  if (modalClose) {
    modalClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('X 버튼 클릭');
      hideModal();
    });
  }
  
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('닫기 버튼 클릭');
      hideModal();
    });
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'modal') {
        console.log('배경 클릭');
        hideModal();
      }
    });
  }
  
  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal && modal.style.display !== 'none') {
        console.log('ESC 키로 모달 닫기');
        hideModal();
      }
    }
  });
}

// 초기화
window.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  // 초기 비어있는 상태 렌더
  updateAll();
  resetStatsFilters(); // Stats 탭 초기화
});