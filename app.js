/**
 * Yummy AI - 기분 기반 저녁 메뉴 추천 앱
 * 
 * 주요 기능:
 * 1. 기분 선택 드롭다운
 * 2. 기분에 맞는 메뉴 랜덤 추천
 * 3. 추천 히스토리 저장 및 표시 (LocalStorage)
 * 4. 반응형 UI
 */

// 감정별 메뉴 데이터베이스
const moodMenu = {
    "우울": [
        { name: "치즈 듬뿍 피자", note: "오늘은 탄수화물 요정의 위로 타임" },
        { name: "초코 브라우니", note: "달달함은 최고의 버그픽스" },
        { name: "아이스크림", note: "차가운 달콤함으로 마음 식히기" },
        { name: "라면", note: "뜨거운 국물이 마음을 녹여줄게" },
        { name: "치킨", note: "바삭함이 우울함을 날려버려" },
        { name: "떡볶이", note: "매콤달콤한 위로의 맛" },
        { name: "초콜릿", note: "달콤한 행복의 비밀" }
    ],
    "피곤": [
        { name: "소고기 해장국", note: "한 숟갈에 에너지 부팅" },
        { name: "삼계탕", note: "체력 게이지 만땅 충전" },
        { name: "갈비탕", note: "진한 국물로 기력 회복" },
        { name: "보양식", note: "몸과 마음의 완전 충전" },
        { name: "닭볶음탕", note: "단백질로 피로 해소" },
        { name: "곰탕", note: "진한 국물의 힘" },
        { name: "육개장", note: "매운맛으로 활력 충전" }
    ],
    "행복": [
        { name: "연어초밥", note: "행복엔 오메가-3 한 접시" },
        { name: "떡볶이", note: "매콤달콤 인생은 소스맛" },
        { name: "케이크", note: "달콤한 순간의 완성" },
        { name: "스테이크", note: "고급스러운 행복의 맛" },
        { name: "샐러드", note: "건강한 행복의 시작" },
        { name: "파스타", note: "이탈리아의 행복을 담은 면" },
        { name: "새우튀김", note: "바삭한 행복의 맛" }
    ],
    "스트레스": [
        { name: "마라탕", note: "스트레스는 얼얼하게 리셋" },
        { name: "돼지구이", note: "지글지글 소리로 디버깅" },
        { name: "매운 닭발", note: "매운맛으로 스트레스 해소" },
        { name: "불닭", note: "불타는 맛으로 스트레스 소각" },
        { name: "김치찌개", note: "시원한 김치로 속 시원하게" },
        { name: "떡볶이", note: "매콤함으로 스트레스 날리기" },
        { name: "순두부찌개", note: "부드러운 위로의 맛" }
    ],
    "심심": [
        { name: "타코", note: "한입 한입이 미니게임" },
        { name: "부리또", note: "말아먹는 재미까지 풀옵션" },
        { name: "샌드위치", note: "다양한 재료의 조화" },
        { name: "샐러드", note: "신선한 재료들의 파티" },
        { name: "스시", note: "하나하나가 예술작품" },
        { name: "핫도그", note: "간단하지만 만족스러운 맛" },
        { name: "버거", note: "다층 구조의 맛의 향연" }
    ],
    "아무거나": [
        { name: "카레", note: "만능 선택지, 실패 없는 빌드" },
        { name: "파스타", note: "소스 골라먹는 재미" },
        { name: "볶음밥", note: "남은 재료로 만드는 마법" },
        { name: "라면", note: "언제나 든든한 선택" },
        { name: "김치찌개", note: "한국인의 소울푸드" },
        { name: "치킨", note: "모든 상황에 어울리는 만능 메뉴" },
        { name: "피자", note: "공유의 즐거움" }
    ]
};

// DOM 요소들
const moodSelect = document.getElementById('moodSelect');
const recommendBtn = document.getElementById('recommendBtn');
const resultArea = document.getElementById('resultArea');
const menuName = document.getElementById('menuName');
const menuNote = document.getElementById('menuNote');
const retryBtn = document.getElementById('retryBtn');
const historyList = document.getElementById('historyList');
const toast = document.getElementById('toast');
const fortuneCookie = document.getElementById('fortuneCookie');
const fortunePopup = document.getElementById('fortunePopup');
const popupMessage = document.getElementById('popupMessage');
const popupClose = document.getElementById('popupClose');

// LocalStorage 키
const STORAGE_KEY = 'yummyHistory';
const FORTUNE_STORAGE_KEY = 'yummyFortune';

// 포춘쿠키 메시지 데이터베이스 (칭찬과 위로 문구들)
const fortuneMessages = [
    "당신은 정말 특별한 사람이에요! ✨",
    "오늘도 수고하셨어요. 정말 대단해요! 👏",
    "당신의 미소가 세상을 더 밝게 만듭니다! 😊",
    "모든 일이 잘 풀릴 거예요. 믿어보세요! 💪",
    "당신은 이미 충분히 멋진 사람입니다! 🌟",
    "오늘은 새로운 기회가 찾아올 거예요! 🚀",
    "당신은 정말 소중한 사람이에요! 💕",
    "모든 어려움을 이겨낼 수 있어요! 🌈",
    "오늘은 행복한 일이 가득할 거예요! 🎉",
    "당신의 노력은 반드시 빛을 발할 거예요! ⭐",
    "오늘은 마법 같은 하루가 될 거예요! 🪄",
    "당신은 이미 성공하고 있어요! 🏆",
    "오늘은 사랑이 가득한 하루예요! ❤️",
    "모든 꿈이 이루어질 거예요! 🌙",
    "당신은 정말 훌륭한 사람이에요! 🌺",
    "오늘은 기적이 일어날 거예요! ✨",
    "당신의 마음은 정말 아름다워요! 🌸",
    "오늘은 축복받은 하루가 될 거예요! 🙏",
    "당신은 세상에 하나뿐인 특별한 사람이에요! 💎",
    "오늘은 모든 것이 당신 편일 거예요! 🍀",
    "당신의 따뜻함이 세상을 바꿔요! 🌞",
    "오늘은 새로운 시작의 날이에요! 🌅",
    "당신은 이미 충분히 훌륭해요! 🌟",
    "오늘은 행운이 가득한 하루예요! 🍀",
    "당신의 긍정적인 에너지가 멋져요! ⚡",
    "오늘은 모든 소원이 이루어질 거예요! 🌠",
    "당신은 정말 멋진 사람이에요! 🌈",
    "오늘은 기쁨이 넘치는 하루가 될 거예요! 🎊",
    "당신의 존재 자체가 축복이에요! 🙌",
    "오늘은 완벽한 하루가 될 거예요! 💫"
];

/**
 * 페이지 로드 시 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Yummy AI 앱이 시작되었습니다.');
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 히스토리 로드 및 표시
    loadHistory();
});

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 추천 받기 버튼 클릭
    recommendBtn.addEventListener('click', handleRecommend);
    
    // 다시 추천 버튼 클릭
    retryBtn.addEventListener('click', handleRetry);
    
    // 포춘쿠키 클릭
    fortuneCookie.addEventListener('click', handleFortuneCookie);
    
    // 팝업 닫기
    popupClose.addEventListener('click', closeFortunePopup);
    
    // 팝업 배경 클릭으로 닫기
    fortunePopup.addEventListener('click', (e) => {
        if (e.target === fortunePopup) {
            closeFortunePopup();
        }
    });
    
    // Enter 키로 추천 (드롭다운에서)
    moodSelect.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleRecommend();
        }
    });
    
    console.log('이벤트 리스너가 등록되었습니다.');
}

/**
 * 추천 받기 처리
 */
function handleRecommend() {
    const selectedMood = moodSelect.value;
    
    // 기분이 선택되지 않은 경우
    if (!selectedMood) {
        showToast('기분을 먼저 선택해주세요! 😊');
        return;
    }
    
    console.log(`선택된 기분: ${selectedMood}`);
    
    // 해당 기분의 메뉴 목록 가져오기
    const menuList = moodMenu[selectedMood];
    
    if (!menuList || menuList.length === 0) {
        showToast('해당 기분에 대한 메뉴가 없습니다.');
        return;
    }
    
    // 랜덤으로 메뉴 선택
    const randomIndex = Math.floor(Math.random() * menuList.length);
    const selectedMenu = menuList[randomIndex];
    
    console.log(`추천된 메뉴: ${selectedMenu.name}`);
    
    // 결과 표시
    displayResult(selectedMenu, selectedMood);
    
    // 히스토리에 저장
    saveToHistory(selectedMenu, selectedMood);
}

/**
 * 다시 추천 처리
 */
function handleRetry() {
    console.log('다시 추천 요청');
    handleRecommend();
}

/**
 * 추천 결과 표시
 */
function displayResult(menu, mood) {
    // 메뉴 정보 표시
    menuName.textContent = menu.name;
    menuNote.textContent = menu.note;
    
    // 결과 영역 보이기
    resultArea.style.display = 'block';
    
    // 결과 영역으로 스크롤
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    console.log(`결과 표시 완료: ${menu.name} - ${menu.note}`);
}

/**
 * 히스토리에 저장
 */
function saveToHistory(menu, mood) {
    try {
        // 현재 히스토리 가져오기
        const history = getHistory();
        
        // 새로운 히스토리 항목 생성
        const newItem = {
            id: Date.now(), // 고유 ID
            timestamp: new Date().toLocaleString('ko-KR'),
            mood: mood,
            menu: menu.name,
            note: menu.note
        };
        
        // 맨 앞에 추가
        history.unshift(newItem);
        
        // 최대 5개까지만 유지
        if (history.length > 5) {
            history.splice(5);
        }
        
        // LocalStorage에 저장
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        
        // 히스토리 화면 업데이트
        renderHistory();
        
        console.log('히스토리에 저장 완료:', newItem);
        
    } catch (error) {
        console.error('히스토리 저장 오류:', error);
        showToast('히스토리 저장에 실패했습니다.');
    }
}

/**
 * 히스토리 가져오기
 */
function getHistory() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('히스토리 로드 오류:', error);
        return [];
    }
}

/**
 * 히스토리 로드 및 표시
 */
function loadHistory() {
    console.log('히스토리 로드 중...');
    renderHistory();
}

/**
 * 히스토리 화면 렌더링
 */
function renderHistory() {
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="no-history">아직 추천 기록이 없습니다.</p>';
        return;
    }
    
    // 히스토리 HTML 생성
    const historyHTML = history.map(item => `
        <div class="history-item">
            <div class="history-time">${item.timestamp}</div>
            <div class="history-mood">${item.mood}</div>
            <div class="history-menu">${item.menu}</div>
        </div>
    `).join('');
    
    historyList.innerHTML = historyHTML;
    
    console.log(`${history.length}개의 히스토리 항목을 표시했습니다.`);
}

/**
 * 포춘쿠키 처리
 */
function handleFortuneCookie() {
    console.log('포춘쿠키 깨기 요청');
    
    // 포춘쿠키 아이콘 애니메이션
    fortuneCookie.classList.add('cracked');
    
    // 랜덤으로 포춘 메시지 선택
    const randomIndex = Math.floor(Math.random() * fortuneMessages.length);
    const selectedMessage = fortuneMessages[randomIndex];
    
    // 잠시 후 팝업 표시
    setTimeout(() => {
        popupMessage.textContent = selectedMessage;
        fortunePopup.classList.add('show');
        
        // 포춘쿠키 히스토리에 저장
        saveFortuneToHistory(selectedMessage);
        
        console.log(`포춘쿠키 메시지: ${selectedMessage}`);
    }, 300);
    
    // 애니메이션 리셋
    setTimeout(() => {
        fortuneCookie.classList.remove('cracked');
    }, 1000);
}

/**
 * 포춘쿠키 팝업 닫기
 */
function closeFortunePopup() {
    fortunePopup.classList.remove('show');
}

/**
 * 포춘쿠키 히스토리에 저장
 */
function saveFortuneToHistory(message) {
    try {
        // 현재 포춘 히스토리 가져오기
        const fortuneHistory = getFortuneHistory();
        
        // 새로운 포춘 항목 생성
        const newFortune = {
            id: Date.now(),
            timestamp: new Date().toLocaleString('ko-KR'),
            message: message
        };
        
        // 맨 앞에 추가
        fortuneHistory.unshift(newFortune);
        
        // 최대 3개까지만 유지
        if (fortuneHistory.length > 3) {
            fortuneHistory.splice(3);
        }
        
        // LocalStorage에 저장
        localStorage.setItem(FORTUNE_STORAGE_KEY, JSON.stringify(fortuneHistory));
        
        console.log('포춘쿠키 히스토리에 저장 완료:', newFortune);
        
    } catch (error) {
        console.error('포춘쿠키 히스토리 저장 오류:', error);
    }
}

/**
 * 포춘쿠키 히스토리 가져오기
 */
function getFortuneHistory() {
    try {
        const stored = localStorage.getItem(FORTUNE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('포춘쿠키 히스토리 로드 오류:', error);
        return [];
    }
}

/**
 * 토스트 메시지 표시
 */
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    // 3초 후 자동 숨김
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
    
    console.log(`토스트 메시지: ${message}`);
}

/**
 * 유틸리티 함수들
 */

// 디버깅용 함수 - 현재 상태 출력
function debugInfo() {
    console.log('=== Yummy AI 디버그 정보 ===');
    console.log('선택된 기분:', moodSelect.value);
    console.log('히스토리 개수:', getHistory().length);
    console.log('사용 가능한 기분:', Object.keys(moodMenu));
    console.log('========================');
}

// 전역에서 디버깅 함수 사용 가능하도록
window.debugInfo = debugInfo;

// 앱 정보 출력
console.log('🍽️ Yummy AI 앱이 준비되었습니다!');
console.log('사용 가능한 기분:', Object.keys(moodMenu));
console.log('디버깅을 위해 debugInfo() 함수를 사용하세요.');
