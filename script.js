let planets = [];
let currentPlanet = null;

// Three.js 글로벌 공간 변수
let scene, camera, renderer, controls;
let starMesh, planetMesh, orbitLineMesh, goldilocksMesh;
let planetAngle = 0; 
let currentOrbitRadiusPx = 15; 

// ==========================================
// ✨ 순차 제어 헬퍼 함수
// ==========================================
function activateSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function resetSections() {
    const sections = document.querySelectorAll('.step-section');
    sections.forEach(sec => sec.classList.remove('active'));
}

document.addEventListener("DOMContentLoaded", () => {
    loadCSV();
    initThreeJS(); 
    document
        .getElementById("startBtn")
        .addEventListener("click", startSimulation);
});

// ======================
// Three.js 엔진 초기화 (Real 3D 공간 구축)
// ======================
function initThreeJS() {
    const container = document.getElementById("canvas-container");
    if(!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 25, 40); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 
    controls.dampingFactor = 0.05;
    controls.maxDistance = 150;    
    controls.minDistance = 5;      

    const ambientLight = new THREE.AmbientLight(0x444444); 
    scene.add(ambientLight);

    const starLight = new THREE.PointLight(0xffffff, 2.5, 300); 
    scene.add(starLight);

    window.addEventListener('resize', () => {
        if(container) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    if (controls) controls.update();
    if (starMesh) starMesh.rotation.y += 0.002;

    if (planetMesh) {
        planetMesh.rotation.y += 0.02; 
        planetAngle += 0.012; 
        planetMesh.position.x = Math.cos(planetAngle) * currentOrbitRadiusPx;
        planetMesh.position.z = Math.sin(planetAngle) * currentOrbitRadiusPx;
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ======================
// CSV 읽기 및 파싱
// ======================
async function loadCSV(){
    try {
        const response = await fetch("planet.csv");
        const text = await response.text();
        parseCSV(text);
    } catch (error) {
        console.error("CSV 파일을 불러오는 중 오류 발생:", error);
    }
}

function parseCSV(text){
    const lines = text.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
    if (lines.length === 0) return;

    const headers = lines[0].split(',').map(h => h.trim());
    const rawData = [];

    for(let i=1; i<lines.length; i++){
        const values = lines[i].split(',');
        const obj = {};
        headers.forEach((header, index)=>{
            obj[header] = values[index] || '';
        });
        rawData.push(obj);
    }
    mergePlanets(rawData);
}

function mergePlanets(raw){
    const map = {};
    raw.forEach(row=>{
        const name = row.pl_name;
        if(!map[name]){ map[name] = {...row}; }
        else{
            Object.keys(row).forEach(key=>{
                if((!map[name][key] || map[name][key] === '') && row[key]){
                    map[name][key] = row[key];
                }
            });
        }
    });
    planets = Object.values(map);
    filterPlanets();
}

function filterPlanets(){
    planets = planets.filter(p =>
        p.pl_rade && p.pl_bmasse && p.pl_orbper && p.st_rad && p.st_teff && p.st_mass
    );
}

// ==========================================
// 🛡️ 행성 및 항성 명칭 전문성 검증 및 필터링 함수
// ==========================================
function cleanCelestialName(name) {
    if (!name || typeof name !== 'string') return "Unknown-Exo";

    // 1. 앞뒤 공백 및 불필요한 공백 제거
    let clean = name.trim().replace(/\s+/g, ' ');

    // 2. 필터링할 유해 키워드/비속어 목록
    const forbiddenKeywords = [
        "fuck", "shit", "bitch", "asshole", "fck", "test", 
        "시발", "씨발", "개새끼", "존나", "쓰레기", "테스트"
    ];

    const lowerClean = clean.toLowerCase();
    const hasForbidden = forbiddenKeywords.some(keyword => lowerClean.includes(keyword));

    // 3. 천문학적 학술 명칭 규칙 검증 (영어, 숫자, 공백, 하이픈, 점, 플러스/마이너스만 허용)
    const validPattern = /^[a-zA-Z0-9\s\-\.\+\s]+$/;

    if (hasForbidden || !validPattern.test(clean) || clean.length < 2) {
        // 부적절하거나 깨진 데이터일 경우 임시 연구용 번호(KOI-임의의 숫자) 형식 부여
        const hash = Math.floor(1000 + Math.random() * 9000);
        return `KOI-${hash}`; 
    }

    return clean;
}

// ======================
// 시뮬레이션 제어 함수 (천천히 뜨도록 타이밍 감속 조정)
// ======================
async function startSimulation() {
    // 1. 초기화 (기존 로직 유지)
    resetSections();
    clearDisplayValues(); // UI 초기화 로직을 함수로 분리하는 것이 좋습니다.

    if (planets.length === 0) {
        alert("데이터가 로드되지 않았습니다.");
        return;
    }

    // 2. 행성 선택
    currentPlanet = planets[Math.floor(Math.random() * planets.length)];

    // 3. 관측 데이터 노출 (장면 1)
    displayObservationData();
    activateSection('sec-observation');

    // 4. 역산 분석 단계로 넘어가기 (장면 2)
    // 💡 2.5초 지연 후 순차 실행
    setTimeout(async () => {
        activateSection('sec-calculation');
        
        // 애니메이션 효과를 위해 약간의 텀을 두고 계산 시작
        await new Promise(resolve => setTimeout(resolve, 500)); 
        await calculatePlanet();
    }, 2500);
}

// UI 초기화 로직을 따로 빼서 가독성을 높였습니다.
function clearDisplayValues() {
    const ids = ["calculationLog", "planetRadius", "planetMass", "orbitRadius", 
                 "density", "insolation", "equilibrium", "habitabilityScore", 
                 "habitabilityLevel", "habitabilityReason"];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === "calculationLog" || id === "habitabilityReason") el.innerHTML = "";
            else if (id === "habitabilityScore") el.innerText = "0%";
            else if (id === "habitabilityLevel") el.innerText = "평가 대기";
            else el.innerText = "???";
        }
    });

    const alienBox = document.getElementById("alien");
    if (alienBox) alienBox.innerHTML = "생명체 분석 대기";
}

function displayObservationData(){
    const p = currentPlanet;
    const starRadius = parseFloat(p.st_rad);
    const starMass = parseFloat(p.st_mass);
    const starTemp = parseFloat(p.st_teff);

    const starLum = Math.pow(starRadius, 2) * Math.pow(starTemp/5778, 4);
    const transit = Math.pow(parseFloat(p.pl_rade) / (109 * starRadius), 2);
    const doppler = 0.09 * parseFloat(p.pl_bmasse) / Math.pow(parseFloat(p.pl_orbper)/365, 1/3) / Math.pow(starMass, 2/3);

    // 항성 명칭 보안 및 정제 필터링 적용
    document.getElementById("hostname").innerText = cleanCelestialName(p.hostname);
    document.getElementById("spectype").innerText = p.st_spectype || "Unknown";
    document.getElementById("starMass").innerText = starMass.toFixed(2) + " M☉";
    document.getElementById("starRadius").innerText = starRadius.toFixed(2) + " R☉";
    document.getElementById("starTemp").innerText = starTemp.toFixed(0) + " K";
    document.getElementById("starLum").innerText = starLum.toFixed(2) + " L☉";
    document.getElementById("transit").innerText = transit.toExponential(3);
    document.getElementById("period").innerText = parseFloat(p.pl_orbper).toFixed(2) + " days";
    document.getElementById("doppler").innerText = doppler.toFixed(3) + " m/s";
}

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function calculatePlanet(){
    const log = document.getElementById("calculationLog");
    log.innerHTML = `<h3>🔭 관측 데이터 기반 물리량 역산 개시</h3><hr>`;

    const p = currentPlanet;
    const starRadius = parseFloat(p.st_rad);
    const starMass = parseFloat(p.st_mass);
    const starTemp = parseFloat(p.st_teff);

    const starLum = Math.pow(starRadius, 2) * Math.pow(starTemp/5778, 4);
    const transit = Math.pow(parseFloat(p.pl_rade) / (109 * starRadius), 2);
    const period = parseFloat(p.pl_orbper);
    const doppler = 0.09 * parseFloat(p.pl_bmasse) / Math.pow(period/365, 1/3) / Math.pow(starMass, 2/3);

    // 💡 아래 각 STEP 출력 사이의 정지 시간을 0.4초에서 1.2초로 대폭 늘림
    // STEP 1
    log.innerHTML += `<h3>STEP 1. 식현상(Transit) 분석</h3>`;
    log.innerHTML += `<span style="color: #00ffcc;">🎯 목표: 행성의 반지름(Rp) 구하기</span><br>`;
    log.innerHTML += `기본 원리: ΔF/F = (Rp / R*)² (밝기 감소율은 반지름 제곱비에 비례)<br><br>`;
    await sleep(1200);
    const radius = Math.sqrt(transit) * 109 * starRadius;
    log.innerHTML += `계산식: Rp = √(밝기감소율) × 109 × 항성반지름<br>`;
    log.innerHTML += `👉 <strong>Rp = ${radius.toFixed(2)} 지구반지름 (R_Earth)</strong><hr>`;

    // STEP 2
    log.innerHTML += `<h3>STEP 2. 도플러 효과(시선속도) 분석</h3>`;
    log.innerHTML += `<span style="color: #00ffcc;">🎯 목표: 행성의 질량(Mp) 구하기</span><br>`;
    log.innerHTML += `기본 원리: 행성의 중력이 항성을 흔드는 속도(K) 측정<br><br>`;
    await sleep(1200);
    const mass = doppler * Math.pow(period/365, 1/3) * Math.pow(starMass, 2/3) / 0.09;
    log.innerHTML += `계산식: Mp = K × P^(1/3) × M*^(2/3) / 0.09<br>`;
    log.innerHTML += `👉 <strong>Mp = ${mass.toFixed(2)} 지구질량 (M_Earth)</strong><hr>`;

    // STEP 3
    log.innerHTML += `<h3>STEP 3. 케플러 제3법칙 적용</h3>`;
    log.innerHTML += `<span style="color: #00ffcc;">🎯 목표: 행성의 공전 궤도 반경(a) 구하기</span><br>`;
    log.innerHTML += `기본 원리: 조화의 법칙 (a³ = M* × P²)<br><br>`;
    await sleep(1200);
    const orbit = Math.pow(starMass * Math.pow(period/365, 2), 1/3);
    log.innerHTML += `계산식: a = ³√(항성질량 × 공전주기²)<br>`;
    log.innerHTML += `👉 <strong>a = ${orbit.toFixed(2)} AU</strong><hr>`;

    // STEP 4
    log.innerHTML += `<h3>STEP 4. 행성 평균 밀도 계산</h3>`;
    log.innerHTML += `<span style="color: #00ffcc;">🎯 목표: 행성의 구성 성분(암석형 vs 가스형) 추정</span><br>`;
    log.innerHTML += `기본 원리: 부피 대비 질량 비율 (ρ = M / R³)<br><br>`;
    await sleep(1200);
    const density = mass / Math.pow(radius, 3);
    log.innerHTML += `계산식: ρ = 행성질량 / 행성반지름³<br>`;
    log.innerHTML += `👉 <strong>ρ = ${density.toFixed(3)} 지구밀도 (ρ_Earth)</strong><hr>`;

    // STEP 5
    log.innerHTML += `<h3>STEP 5. 항성 복사 에너지량 계산</h3>`;
    log.innerHTML += `<span style="color: #00ffcc;">🎯 목표: 행성이 받는 별빛의 세기(S) 구하기</span><br>`;
    log.innerHTML += `기본 원리: 거리 제곱 역비례 법칙 (S = L / a²)<br><br>`;
    await sleep(1200);
    const insol = starLum / (orbit * orbit);
    log.innerHTML += `계산식: S = 항성광도 / 궤도반경²<br>`;
    log.innerHTML += `👉 <strong>S = ${insol.toFixed(2)} 지구복사량 (S_Earth)</strong><hr>`;

    // STEP 6
    log.innerHTML += `<h3>STEP 6. 행성 평형 온도 유도</h3>`;
    log.innerHTML += `<span style="color: #00ffcc;">🎯 목표: 대기가 없을 때 행성의 표면 온도(T) 추정</span><br>`;
    log.innerHTML += `기본 원리: 슈테판-볼츠만 법칙 기반 복사 평형 상태 유도<br><br>`;
    await sleep(1200);
    const temp = 278 * Math.pow(insol * 0.7, 0.25);
    log.innerHTML += `계산식: T = 278 × (복사량 × (1 - 반사율))^(1/4)<br>`;
    log.innerHTML += `👉 <strong>T = ${temp.toFixed(0)} K</strong><hr>`;

    // 원시 DOM 테이블 바인딩
    document.getElementById("planetRadius").innerText = radius.toFixed(2) + " R_Earth";
    document.getElementById("planetMass").innerText = mass.toFixed(2) + " M_Earth";
    document.getElementById("orbitRadius").innerText = orbit.toFixed(2) + " AU";
    document.getElementById("density").innerText = density.toFixed(2) + " ρ_Earth";
    document.getElementById("insolation").innerText = insol.toFixed(2) + " S_Earth";
    document.getElementById("equilibrium").innerText = temp.toFixed(0) + " K";

    // 💡 역산 완료 데이터 테이블 오픈 대기 시간 증가 (기존 0.6초 -> 2초)
    await sleep(2000);
    activateSection('sec-result');
    
    // 💡 다음 거주성 판별 패널로 가기 전 생각할 시간 확보 (기존 0.6초 -> 2.5초)
    await sleep(2500);
    calculateHabitability(radius, mass, orbit, density, insol, temp);
}

// ==========================
// 거주 가능성 평가 및 그래픽 인터페이스 연동
// ==========================
// ==========================
// 거주 가능성 평가 및 그래픽 인터페이스 연동 (모든 물리량 세부 점수 및 왼쪽 정렬 보정 버전)
// ==========================
async function calculateHabitability(radius, mass, orbit, density, insol, temp){
    // 텍스트 전체를 정렬하기 위해 스타일이 들어간 감싸는 div 태그 주입
    let reason = ["<div style='text-align: left; max-width: 450px; margin: 0 auto; line-height: 1.6; font-size: 0.95rem;'>"];
    
    // 부모 항성의 스펙트럼 타입 파악 (currentPlanet 구조 대응 및 방어 코드)
    let starSpec = "G";
    if (typeof currentPlanet !== "undefined" && currentPlanet) {
        starSpec = currentPlanet.st_spectype || "Unknown";
        if (starSpec === "Unknown" || !starSpec) {
            const teff = parseFloat(currentPlanet.st_teff);
            if (teff < 3700) starSpec = "M";
            else if (teff < 5200) starSpec = "K";
        }
    }

    // -----------------------------------------------------
    // 🌍 [조건 1] 행성 물리량 일치도 세부 점수 계산 (최대 20점)
    // -----------------------------------------------------
    reason.push("<h4 style='margin-bottom: 8px; color: #00cec9;'>[1] 행성 물리량 세부 점수 (지구 일치도)</h4>");

    // 1) 반지름 (최대 3점)
    let score_r = 0; 
    if (radius >= 0.5 && radius <= 3.0) {
        score_r = 3 * (1 - Math.abs(radius - 1) / 2.0);
        reason.push(`📐 <b>반지름:</b> ${score_r.toFixed(2)} / 3.00점 (현재: ${radius.toFixed(2)} R⊕)`);
    } else {
        reason.push(`❌ <b>반지름 범위 초과:</b> 0.00 / 3.00점 (현재: ${radius.toFixed(2)} R⊕ / 기준: 0.5~3.0배)`);
    }

    // 2) 질량 (최대 5점)
    let score_m = 0; 
    if (mass >= 0.3 && mass <= 10.0) {
        score_m = 5 * (1 - Math.abs(mass - 1) / 9.0);
        reason.push(`⚖️ <b>질량:</b> ${score_m.toFixed(2)} / 5.00점 (현재: ${mass.toFixed(2)} M⊕)`);
    } else {
        reason.push(`❌ <b>질량 범위 초과:</b> 0.00 / 5.00점 (현재: ${mass.toFixed(2)} M⊕ / 기준: 0.3~10.0배)`);
    }

    // 골디락스존 유무 판정 (복사량 기준 0.35 ~ 1.75)
    let in_hz = (insol >= 0.35 && insol <= 1.75);

    // 3) 궤도 장반경 (최대 1점)
    let score_o = 0; 
    if (in_hz) {
        score_o = 1 * (1 - Math.min(Math.abs(orbit - 1) / 2.0, 1));
        reason.push(`💫 <b>궤도 장반경:</b> ${score_o.toFixed(2)} / 1.00점 (현재: ${orbit.toFixed(2)} AU)`);
    } else {
        reason.push(`❌ <b>궤도 장반경 이탈:</b> 0.00 / 1.00점 (현재: ${orbit.toFixed(2)} AU / 골디락스존 외)`);
    }

    // 4) 표면 온도 (최대 7점)
    let score_t = 0; 
    if (temp >= 200 && temp <= 350) {
        score_t = 7 * (1 - Math.abs(temp - 275) / 75.0);
        reason.push(`🌡️ <b>평형 온도:</b> ${score_t.toFixed(2)} / 7.00점 (현재: ${temp.toFixed(0)} K)`);
    } else {
        reason.push(`❌ <b>평형 온도 범위 초과:</b> 0.00 / 7.00점 (현재: ${temp.toFixed(0)} K / 기준: 200~350K)`);
    }

    // 5) 평균밀도 (최대 4점)
    let score_d = 0; 
    if (density >= 0.5 && density <= 1.5) {
        score_d = 4 * (1 - Math.abs(density - 1) / 0.5);
        reason.push(`🧱 <b>평균 밀도:</b> ${score_d.toFixed(2)} / 4.00점 (현재: ${density.toFixed(2)} ρ⊕)`);
    } else {
        reason.push(`❌ <b>평균 밀도 범위 초과:</b> 0.00 / 4.00점 (현재: ${density.toFixed(2)} ρ⊕ / 기준: 0.5~1.5배)`);
    }

    // 물리량 총점 합산 (최대 20점 보정)
    let cond1_score = score_r + score_m + score_o + score_t + score_d;
    if (cond1_score >= 20) cond1_score = 19.99;
    reason.push(`<b style='color: #ffeaa7;'>└ 🌍 물리량 합계 점수:</b> ${cond1_score.toFixed(2)} / 20.00점`);
    reason.push("<hr style='border:0; border-top:1px dashed #555; margin:12px 0;'>");

    // -----------------------------------------------------
    // 🌌 [조건 2 & 3 통합] 조합 점수 (최대 80점)
    // -----------------------------------------------------
    reason.push("<h4 style='margin-bottom: 8px; color: #00cec9;'>[2] 우주 환경 조합 점수 (항성종류 + 골디락스존)</h4>");
    
    let combination_score = 0;
    const isMType = starSpec.includes("M");
    const isKType = starSpec.includes("K");

    if (in_hz && isMType) {
        combination_score = 80;
        reason.push("🌟 <b style='color: #2ecc71;'>최적 환경 만족:</b> M형 왜성 & 골디락스존 안착 (+80.00점)");
    } else if (in_hz && isKType) {
        combination_score = 50;
        reason.push("✨ <b style='color: #f1c40f;'>안정 환경 만족:</b> K형 항성 & 골디락스존 안착 (+50.00점)");
    } else {
        combination_score = 0;
        reason.push("⚠️ <b>환경 조합 부적합:</b> M형·K형 항성이 아니거나 골디락스존을 벗어남 (+0.00점)");
    }

    // 감싸는 div 태그 닫기
    reason.push("</div>");

    // -----------------------------------------------------
    // 🏆 최종 점수 합산 및 UI 출력
    // -----------------------------------------------------
    let total_score = cond1_score + combination_score;
    total_score = Math.max(0, Math.min(99.99, total_score));
    let displayScore = total_score.toFixed(2);

    let level = "낮음";
    if (total_score >= 80) level = "매우 높음";
    else if (total_score >= 60) level = "높음";
    else if (total_score >= 40) level = "보통";

    document.getElementById("habitabilityScore").innerText = displayScore + "%";
    document.getElementById("habitabilityLevel").innerText = "거주 가능성 : " + level;
    
    // 조립된 왼쪽 정렬 세부 리스트 로그를 화면에 주입
    document.getElementById("habitabilityReason").innerHTML = reason.join("<br>").replace(/<br><div/g, "<div").replace(/<\/div><br>/g, "</div>");

    // 거주 가능성 패널 활성화
    activateSection('sec-habitability');
    
    // 3D 엔진 구동 연출 전 딜레이 (3초)
    await sleep(3000);

    const starRadius = parseFloat(currentPlanet.st_rad);
    const starTemp = parseFloat(currentPlanet.st_teff);
    const starLum = Math.pow(starRadius, 2) * Math.pow(starTemp/5778, 4);
    
    // 3D 뷰어 엔진 업데이트 (보정된 스케일 함수 호출)
    updateThreeJSScene(radius, density, temp, total_score, starRadius, starLum, orbit, starTemp);
    
    // 2D HUD 정보창 업데이트 호출
    update2DHUD(radius, mass, orbit, temp, density);

    // HTML에 해당 엘리먼트가 없을 경우를 대비한 안전 장치 포함 외계인 등장 코드
    let hasAlien = total_score >= 60;
    const alienDancerBox = document.getElementById("live-alien-dancer");
    const alienImgTag = document.getElementById("live-alien-img");
    
    if (hasAlien && alienDancerBox && alienImgTag) {
        let chosenAlienNum = Math.floor(Math.random() * 7) + 1;
        alienDancerBox.style.position = "fixed";  
        alienDancerBox.style.top = "40px";         
        alienDancerBox.style.left = "50%";         
        alienDancerBox.style.transform = "translateX(-50%)"; 
        alienDancerBox.style.zIndex = "9999";      
        alienImgTag.src = `외계인폴더/외계인${chosenAlienNum}.png`;
        alienDancerBox.style.display = "block";
    } else {
        if (alienDancerBox) alienDancerBox.style.display = "none";
        // 원시 소스 내 구형 하단 텍스트 컴포넌트 호환용 안전 처리
        if (typeof createAlien === "function") createAlien(total_score, density, temp, mass);
    }

    if (typeof setupTerraform === "function") setupTerraform(radius, mass, orbit);

    // 3D 시뮬레이터 및 실시간 HUD 활성화
    activateSection('sec-simulation');

    // 리사이즈 종횡비 수리
    if (renderer) {
        const container = document.getElementById("canvas-container");
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

// ==========================================
// 거주 가능성 평가 및 그래픽 인터페이스 연동 (오류 수정 및 동기화 버전)
// ==========================================
async function calculateHabitability(radius, mass, orbit, density, insol, temp){
    // 텍스트 전체를 정렬하기 위해 스타일이 들어간 감싸는 div 태그 주입
    let reason = ["<div style='text-align: left; max-width: 450px; margin: 0 auto; line-height: 1.6; font-size: 0.95rem;'>"];
    
    let starSpec = "G";
    if (typeof currentPlanet !== "undefined" && currentPlanet) {
        starSpec = currentPlanet.st_spectype || "Unknown";
        if (starSpec === "Unknown" || !starSpec) {
            const teff = parseFloat(currentPlanet.st_teff);
            if (teff < 3700) starSpec = "M";
            else if (teff < 5200) starSpec = "K";
        }
    }

    // -----------------------------------------------------
    // 🌍 [조건 1] 행성 물리량 일치도 세부 점수 계산 (최대 20점)
    // -----------------------------------------------------
    reason.push("<h4 style='margin-bottom: 8px; color: #00cec9;'>[1] 행성 물리량 세부 점수 (지구 일치도)</h4>");

    // 1) 반지름
    let score_r = 0; 
    if (radius >= 0.5 && radius <= 3.0) {
        score_r = 3 * (1 - Math.abs(radius - 1) / 2.0);
        reason.push(`📐 <b>반지름:</b> ${score_r.toFixed(2)} / 3.00점 (현재: ${radius.toFixed(2)} R⊕)`);
    } else {
        reason.push(`❌ <b>반지름 범위 초과:</b> 0.00 / 3.00점 (현재: ${radius.toFixed(2)} R⊕ / 기준: 0.5~3.0배)`);
    }

    // 2) 질량
    let score_m = 0; 
    if (mass >= 0.3 && mass <= 10.0) {
        score_m = 5 * (1 - Math.abs(mass - 1) / 9.0);
        reason.push(`⚖️ <b>질량:</b> ${score_m.toFixed(2)} / 5.00점 (현재: ${mass.toFixed(2)} M⊕)`);
    } else {
        reason.push(`❌ <b>질량 범위 초과:</b> 0.00 / 5.00점 (현재: ${mass.toFixed(2)} M⊕ / 기준: 0.3~10.0배)`);
    }

    let in_hz = (insol >= 0.35 && insol <= 1.75);

    // 3) 궤도 장반경
    let score_o = 0; 
    if (in_hz) {
        score_o = 1 * (1 - Math.min(Math.abs(orbit - 1) / 2.0, 1));
        reason.push(`💫 <b>궤도 장반경:</b> ${score_o.toFixed(2)} / 1.00점 (현재: ${orbit.toFixed(2)} AU)`);
    } else {
        reason.push(`❌ <b>궤도 장반경 이탈:</b> 0.00 / 1.00점 (현재: ${orbit.toFixed(2)} AU / 골디락스존 외)`);
    }

    // 4) 표면 온도
    let score_t = 0; 
    if (temp >= 200 && temp <= 350) {
        score_t = 7 * (1 - Math.abs(temp - 275) / 75.0);
        reason.push(`🌡️ <b>평형 온도:</b> ${score_t.toFixed(2)} / 7.00점 (현재: ${temp.toFixed(0)} K)`);
    } else {
        reason.push(`❌ <b>평형 온도 범위 초과:</b> 0.00 / 7.00점 (현재: ${temp.toFixed(0)} K / 기준: 200~350K)`);
    }

    // 5) 평균밀도
    let score_d = 0; 
    if (density >= 0.5 && density <= 1.5) {
        score_d = 4 * (1 - Math.abs(density - 1) / 0.5);
        reason.push(`🧱 <b>평균 밀도:</b> ${score_d.toFixed(2)} / 4.00점 (현재: ${density.toFixed(2)} ρ⊕)`);
    } else {
        reason.push(`❌ <b>평균 밀도 범위 초과:</b> 0.00 / 4.00점 (현재: ${density.toFixed(2)} ρ⊕ / 기준: 0.5~1.5배)`);
    }

    let cond1_score = score_r + score_m + score_o + score_t + score_d;
    if (cond1_score >= 20) cond1_score = 19.99;
    reason.push("<hr style='border:0; border-top:1px dashed #555; margin:12px 0;'>");

    // -----------------------------------------------------
    // 🌌 [조건 2 & 3 통합] 조합 점수 (최대 80점)
    // -----------------------------------------------------
    reason.push("<h4 style='margin-bottom: 8px; color: #00cec9;'>[2] 우주 환경 조합 점수 (항성종류 + 골디락스존)</h4>");
    
    let combination_score = 0;
    const isMType = starSpec.includes("M");
    const isKType = starSpec.includes("K");

    if (in_hz && isMType) {
        combination_score = 80;
        reason.push("🌟 <b style='color: #2ecc71;'>최적 환경 만족:</b> M형 왜성 & 골디락스존 안착 (+80.00점)");
    } else if (in_hz && isKType) {
        combination_score = 50;
        reason.push("✨ <b style='color: #f1c40f;'>안정 환경 만족:</b> K형 항성 & 골디락스존 안착 (+50.00점)");
    } else {
        combination_score = 0;
        reason.push("⚠️ <b>환경 조합 부적합:</b> M형·K형 항성이 아니거나 골디락스존을 벗어남 (+0.00점)");
    }

    reason.push("</div>");

    // 최종 점수 합산
    let total_score = cond1_score + combination_score;
    total_score = Math.max(0, Math.min(99.99, total_score));
    let displayScore = total_score.toFixed(2);

    let level = "낮음";
    if (total_score >= 80) level = "매우 높음";
    else if (total_score >= 60) level = "높음";
    else if (total_score >= 40) level = "보통";

    document.getElementById("habitabilityScore").innerText = displayScore + "%";
    document.getElementById("habitabilityLevel").innerText = "거주 가능성 : " + level;
    document.getElementById("habitabilityReason").innerHTML = reason.join("<br>").replace(/<br><div/g, "<div").replace(/<\/div><br>/g, "</div>");

    activateSection('sec-habitability');
    await sleep(3000);

    const starRadius = parseFloat(currentPlanet.st_rad);
    const starTemp = parseFloat(currentPlanet.st_teff);
    const starLum = Math.pow(starRadius, 2) * Math.pow(starTemp/5778, 4);
    
    // 3D 뷰어 엔진 및 HUD 동기화 업데이트 호출
    updateThreeJSScene(radius, density, temp, total_score, starRadius, starLum, orbit, starTemp);
    update2DHUD(radius, mass, orbit, temp, density);

    // 👽 [외계인 상단 등장 확률 세팅] 점수 60점 이상일 때 100% 확률 무작위 등장
    let hasAlien = total_score >= 80;
    const alienDancerBox = document.getElementById("live-alien-dancer");
    const alienImgTag = document.getElementById("live-alien-img");
    
    if (hasAlien && alienDancerBox && alienImgTag) {
        let chosenAlienNum = Math.floor(Math.random() * 7) + 1;
        alienDancerBox.style.display = "block";
        alienImgTag.src = `외계인폴더/외계인${chosenAlienNum}.png`;
    } else {
        if (alienDancerBox) alienDancerBox.style.display = "none";
    }

    // 하단 컴포넌트 예외 처리 안전 기동
    if (document.getElementById("alien")) {
        createAlien(total_score, density, temp, mass);
    }
    if (document.getElementById("massSlider")) {
        setupTerraform(radius, mass, orbit);
    }

    activateSection('sec-simulation');

    if (renderer) {
        const container = document.getElementById("canvas-container");
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

// ==========================================
// 3D 그래픽 엔진 (궤도 장반경 제한 전면 해제 버전)
// ==========================================
// ========================================================
// 3D 그래픽 엔진 (관측된 진짜 궤도 장반경 100% 무조건 반영 버전)
// ========================================================
function updateThreeJSScene(radius, density, temp, score, starRadius, starLum, orbit, starTemp) {
    if (!scene) return;

    // 기존 메쉬들 잔상 제거
    if (starMesh) scene.remove(starMesh);
    if (planetMesh) scene.remove(planetMesh);
    if (orbitLineMesh) scene.remove(orbitLineMesh);
    if (goldilocksMesh) scene.remove(goldilocksMesh);

    // 1. 스케일 팩터 (공간 배율 고정)
    const scaleFactor = 35; 

    // [항성 크기 고정] 항성이 너무 커져서 행성 궤도를 먹어버리지 않도록 아주 작게 고정 (지름 1.0)
    // 이렇게 해야 아주 작은 궤도(예: 0.02 AU)를 가진 행성도 정상적으로 별 밖에 보임!
    const visualStarRad = 1.0; 

    let starColor = 0xffaa00; 
    if (starTemp >= 7500) starColor = 0xadc7ff;      
    else if (starTemp >= 6000) starColor = 0xf8f7ff; 
    else if (starTemp >= 5200) starColor = 0xfff4ea; 
    else if (starTemp >= 3700) starColor = 0xffddb4; 
    else starColor = 0xffb3a7;                       
    
    const starGeo = new THREE.SphereGeometry(visualStarRad, 32, 32);
    const starMat = new THREE.MeshBasicMaterial({ color: starColor });
    starMesh = new THREE.Mesh(starGeo, starMat);
    scene.add(starMesh);

    // 🚀 2. [궤도 장반경 제한 전면 철폐] 
    // 관측 데이터의 orbit(AU) 값에 scaleFactor만 곱해서 "무조건" 그대로 씁니다. (Math.max 같은 제한 절대 없음)
    currentOrbitRadiusPx = orbit * scaleFactor;

    // 3. 골디락스 존 가시화 (이것도 제한 없이 순수 계산값으로 링 렌더링)
    const hzInner = Math.sqrt(starLum / 1.1) * scaleFactor;
    const hzOuter = Math.sqrt(starLum / 0.53) * scaleFactor;

    const goldilocksGeo = new THREE.RingGeometry(hzInner, hzOuter, 64);
    goldilocksGeo.rotateX(Math.PI / 2); 
    const goldilocksMat = new THREE.MeshBasicMaterial({ 
        color: 0x2ecc71, side: THREE.DoubleSide, transparent: true, opacity: 0.15 
    });
    goldilocksMesh = new THREE.Mesh(goldilocksGeo, goldilocksMat);
    scene.add(goldilocksMesh);

    // 🚀 4. 행성 공전 궤도선 생성 (관측된 진짜 궤도 반지름 그대로 적용)
    // 0.01 같은 최소값 제한도 삭제! 진짜 orbit 크기대로만 그려짐.
    const orbitGeo = new THREE.RingGeometry(currentOrbitRadiusPx - 0.08, currentOrbitRadiusPx + 0.08, 64);
    orbitGeo.rotateX(Math.PI / 2);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
    orbitLineMesh = new THREE.Mesh(orbitGeo, orbitMat);
    scene.add(orbitLineMesh);

    // 5. 행성 비주얼 및 표면색 설정
    let planetColor = 0x7bed9f; 
    if (temp < 220) planetColor = 0x74b9ff;       
    else if (temp > 330) planetColor = 0xff7675;  
    else if (density > 1.5) planetColor = 0xb2bec3; 

    // 행성 크기가 너무 크면 궤도를 삐져나가니까 컴팩트하게 조정
    const planetGeo = new THREE.SphereGeometry(Math.max(0.15, radius * 0.15), 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({ color: planetColor, roughness: 0.6, metalness: 0.1 });
    planetMesh = new THREE.Mesh(planetGeo, planetMat);
    
    // 궤도 반지름 위치에 정확히 배치
    planetMesh.position.x = currentOrbitRadiusPx;
    scene.add(planetMesh);

    // 골디락스 존 진입 시 하이라이트
    if (orbit >= Math.sqrt(starLum/1.1) && orbit <= Math.sqrt(starLum/0.53)) {
        orbitMat.color.setHex(0x2ecc71);
        orbitMat.opacity = 0.5;
    }
}

// ==========================================
// 2D HUD 오버레이 데이터 정상 매핑 및 스케일 연동
// ==========================================
function update2DHUD(radius, mass, orbit, temp, density) {
    // index.html 내부의 CamelCase ID구조(hudMass, hudRadius 등)에 맞춤 매핑 해결
    if (document.getElementById("hudMass")) {
        document.getElementById("hudMass").innerText = mass.toFixed(2) + " M_Earth";
    }
    if (document.getElementById("hudRadius")) {
        document.getElementById("hudRadius").innerText = radius.toFixed(2) + " R_Earth";
    }
    if (document.getElementById("hudOrbit")) {
        document.getElementById("hudOrbit").innerText = orbit.toFixed(2) + " AU";
    }
    if (document.getElementById("hudTemp")) {
        document.getElementById("hudTemp").innerText = temp.toFixed(0) + " K";
    }

    const validatedExoName = cleanCelestialName(currentPlanet.pl_name);
    if (document.getElementById("hudExoName")) {
        document.getElementById("hudExoName").innerText = `${validatedExoName} (${radius.toFixed(2)} R_Earth)`;
    }

    const exoCircle = document.getElementById("hudExoCircle");
    if(exoCircle) {
        let targetPixelSize = 30 * radius;
        targetPixelSize = Math.max(10, Math.min(70, targetPixelSize));
        
        exoCircle.style.width = targetPixelSize + "px";
        exoCircle.style.height = targetPixelSize + "px";

        if (temp < 220) {
            exoCircle.style.background = "radial-gradient(circle at 30% 30%, #e0ffff, #4682b4)";
        } else if (temp > 330) {
            exoCircle.style.background = "radial-gradient(circle at 30% 30%, #ff4500, #8b0000)";
        } else if (density > 1.5) {
            exoCircle.style.background = "radial-gradient(circle at 30% 30%, #a9a9a9, #555555)";
        } else {
            exoCircle.style.background = "radial-gradient(circle at 30% 30%, #7bed9f, #2ed573)";
        }
    }
}

// ==========================
// 예상 생명체 빌더 (하단 레거시 구역 대응)
// ==========================
function createAlien(score, density, temp, mass){
    const alien = document.getElementById("alien");
    if(!alien) return;

    if(score < 70){
        alien.innerHTML = `<span style="font-size: 1.1rem; color: #aaa;">생명체 존재 가능성이 낮습니다.</span>`;
        return;
    }

    let body = "👽";
    let desc = [];

    if(temp < 220){ desc.push("저온 환경 적응 생명체"); body += "❄️"; }
    if(temp > 300){ desc.push("고온 임계 압축 적응"); body += "🔥"; }
    if(density > 1.5){ desc.push("고밀도 중력 골격 발달"); body += "💪"; }
    if(mass < 1){ desc.push("저중력 대기 부유 구조"); body += "🪶"; }

    if(desc.length === 0) desc.push("지구형 표준 생태 환경 생명체");

    alien.innerHTML = `
        <div style="text-align: center; width: 100%;">
            <div style="font-size: 50px; margin-bottom: 10px;">${body}</div>
            <div style="font-size: 1.1rem; line-height: 1.5; color: #7cc7ff;">
                <strong>예상 진화 특징</strong><br>
                <span style="color: #ccc; font-size: 0.95rem;">${desc.join("<br>")}</span>
            </div>
        </div>
    `;
}
// ==========================
// 행성 개조 연동 컨트롤러
// ==========================
function setupTerraform(radius, mass, orbit){
    const massSlider = document.getElementById("massSlider");
    const orbitSlider = document.getElementById("orbitSlider");
    const albedoSlider = document.getElementById("albedoSlider");

    if(!massSlider || !orbitSlider || !albedoSlider) return;

    massSlider.value = mass;
    orbitSlider.value = orbit;
    albedoSlider.value = 0.3;

    document.getElementById("massValue").innerText = parseFloat(mass).toFixed(2);
    document.getElementById("orbitValue").innerText = parseFloat(orbit).toFixed(2);
    document.getElementById("albedoValue").innerText = "0.30";

    massSlider.oninput = () => document.getElementById("massValue").innerText = parseFloat(massSlider.value).toFixed(2);
    orbitSlider.oninput = () => document.getElementById("orbitValue").innerText = parseFloat(orbitSlider.value).toFixed(2);
    albedoSlider.oninput = () => document.getElementById("albedoValue").innerText = parseFloat(albedoSlider.value).toFixed(2);

    document.getElementById("simulateBtn").onclick = () => {
        const newOrbit = parseFloat(orbitSlider.value);
        const albedo = parseFloat(albedoSlider.value);
        
        const luminosity = Math.pow(parseFloat(currentPlanet.st_rad), 2) * Math.pow(parseFloat(currentPlanet.st_teff)/5778, 4);
        const insol = luminosity / (newOrbit * newOrbit);
        const temp = 278 * Math.pow(insol * (1 - albedo), 0.25);

        alert(`행성 개조 완료!\n\n새 복사량 : ${insol.toFixed(2)} S⊕\n새 평형온도 : ${temp.toFixed(0)} K`);
    };
}
