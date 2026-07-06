// ==========================================
// 🔥 Firebase 설정 및 초기화 세팅
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCXOvJ1R9pknYu-0Q25shEqFcSaaUg9034",
    authDomain: "planet-c07f0.firebaseapp.com",
    projectId: "planet-c07f0",
    storageBucket: "planet-c07f0.firebasestorage.app",
    messagingSenderId: "805169386192",
    appId: "1:805169386192:web:a608880fd88ce70af644d5",
    measurementId: "G-58FJ4BZ3EC",
    databaseURL: "https://planet-c07f0-default-rtdb.firebaseio.com" 
};

// 최신 라이브러리 호환 방식으로 데이터베이스 인스턴스 가동
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// 글로벌 변수단
let finalCalculatedData = {};
let scene, camera, renderer, controls;
let starMesh, planetMesh, orbitLineMesh, goldilocksMesh;
let planetAngle = 0;
let currentOrbitRadiusPx = 15;
let generatedPlanetData = {};

// ==========================================
// 🛡️ 행성 및 사용자 입력 명칭 필터링 헬퍼 함수
// ==========================================
function validateAndCleanName(name, isUserCustom = false) {
    if (!name || typeof name !== 'string') return isUserCustom ? "" : "VIR-9999 b";

    // 1. 공백 정제
    let clean = name.trim().replace(/\s+/g, ' ');

    // 2. 비속어 및 금지어 필터링 목록
    const forbiddenKeywords = [
        "fuck", "shit", "bitch", "asshole", "fck", "test", 
        "시발", "씨발", "개새끼", "존나", "쓰레기", "성소휘", "엉덩이","ㅆㅂ","ㅅㅂ","쓰바","쌰바"
    ];

    const lowerClean = clean.toLowerCase();
    const hasForbidden = forbiddenKeywords.some(keyword => lowerClean.includes(keyword));

    // 3. 학술적 명칭 및 유효 패턴 매칭 (사용자 맞춤 이름은 한국어/영어/숫자/공백/하이픈 허용)
    const pattern = isUserCustom ? /^[a-zA-Z0-9가-힣\s\-]+$/ : /^[a-zA-Z0-9\s\-\.]+$/;

    if (hasForbidden || !pattern.test(clean) || clean.length < 2) {
        if (isUserCustom) {
            // 사용자가 비속어를 썼을 때 검증 실패 처리용 flag 리턴
            return false;
        } else {
            // 시스템 자동 생성 데이터에 예외가 생길 시 안전 보정값
            return "VIR-" + Math.floor(1000 + Math.random() * 9000) + " b";
        }
    }

    return clean;
}

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

// DOMContentLoaded 초기화
document.addEventListener("DOMContentLoaded", () => {
    initThreeJS();
    document.getElementById("startBtn").addEventListener("click", generateVirtualSystem);
    document.getElementById("saveDbBtn").addEventListener("click", savePlanetToFirebase);
});

// Three.js 3D 공간 초기화
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

    scene.add(new THREE.AmbientLight(0x444444));
    const starLight = new THREE.PointLight(0xffffff, 2.5, 300);
    scene.add(starLight);

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
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
    if (renderer && scene && camera) renderer.render(scene, camera);
}

// ==========================================
// 🎯 100% 확률 골디락스 존 고정 생성 엔진
// ==========================================
function generateVirtualSystem() {
    // 새로운 탐사 시작 시 이전 섹션들 전부 리셋
    resetSections();

    let st_mass = parseFloat((Math.random() * (1.5 - 0.4) + 0.4).toFixed(2));
    let st_rad = parseFloat((st_mass * (Math.random() * (1.2 - 0.8) + 0.8)).toFixed(2));
    let st_teff = Math.round(5000 * Math.pow(st_mass, 0.5) * (Math.random() * (1.1 - 0.9) + 0.9));
    let starLum = Math.pow(st_rad, 2) * Math.pow(st_teff / 5778, 4);

    // 가상 행성 기본 데이터 자동생성 및 안전 정제
    let raw_pl_name = "VIR-" + Math.floor(Math.random() * 9000 + 1000) + " b";
    let pl_name = validateAndCleanName(raw_pl_name, false);
    let hostname = pl_name.split(' ')[0];

    let st_spectype = "G";
    if(st_teff >= 7500) st_spectype = "A";
    else if(st_teff >= 6000) st_spectype = "F";
    else if(st_teff >= 5200) st_spectype = "G";
    else if(st_teff >= 3700) st_spectype = "K";
    else st_spectype = "M";

    let target_orbit = parseFloat((Math.sqrt(starLum) * (Math.random() * (1.1 - 0.9) + 0.9)).toFixed(2)); 
    
    if (target_orbit < st_rad * 0.05) {
        target_orbit = parseFloat((st_rad * 0.1).toFixed(2));
    }

    let target_radius, target_mass;
    const isRocky = Math.random() < 0.50; 

    if (isRocky) {
        target_radius = parseFloat((Math.random() * (1.5 - 0.8) + 0.8).toFixed(2));
        let target_density = Math.random() * (1.2 - 0.8) + 0.8;
        target_mass = parseFloat((target_density * Math.pow(target_radius, 3)).toFixed(2));
    } else {
        target_radius = parseFloat((Math.random() * (8.0 - 3.5) + 3.5).toFixed(2));
        target_mass = parseFloat((Math.random() * (80.0 - 15.0) + 15.0).toFixed(2));
    }

    let pl_orbper = parseFloat((Math.sqrt(Math.pow(target_orbit, 3) / st_mass) * 365).toFixed(2));
    let transit = Math.pow(target_radius / (109 * st_rad), 2);
    let doppler = (0.09 * target_mass) / (Math.pow(pl_orbper / 365, 1 / 3) * Math.pow(st_mass, 2 / 3));

    generatedPlanetData = {
        hostname, pl_name, st_spectype, st_mass, st_rad, st_teff, starLum,
        transit, pl_orbper, doppler, isIdeal: isRocky
    };

    displayInitialData();
    
    // 2단계: 가상 관측 초기값 섹션 오픈
    activateSection('sec-observation');

    // 💡 다음 카드 활성화 타임을 지연하여 천천히 뜨도록 감속 연출 (기존 1초 -> 2.5초)
    setTimeout(() => {
        activateSection('sec-calculation');
        calculatePlanet();
    }, 2500);
}

function displayInitialData() {
    const d = generatedPlanetData;
    document.getElementById("hostname").innerText = d.hostname;
    document.getElementById("spectype").innerText = d.st_spectype + "형";
    document.getElementById("starMass").innerText = d.st_mass.toFixed(2) + " M☉";
    document.getElementById("starRadius").innerText = d.st_rad.toFixed(2) + " R☉";
    document.getElementById("starTemp").innerText = d.st_teff.toFixed(0) + " K";
    document.getElementById("starLum").innerText = d.starLum.toFixed(2) + " L☉";
    document.getElementById("transit").innerText = d.transit.toExponential(3);
    document.getElementById("period").innerText = d.pl_orbper.toFixed(2) + " days";
    document.getElementById("doppler").innerText = d.doppler.toFixed(3) + " m/s";
}

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

// 역산 및 분석 프로세스
async function calculatePlanet(){
    const log = document.getElementById("calculationLog");
    log.innerHTML = `<h3>🔭 가상 데이터 분석 시스템 가동</h3><hr>`;

    const d = generatedPlanetData;
    const starRadius = d.st_rad;
    const starMass = d.st_mass;
    const starTemp = d.st_teff;
    const starLum = d.starLum;
    const transit = d.transit;
    const period = d.pl_orbper;
    const doppler = d.doppler;

    // 💡 로그 단계마다 찍히는 간격을 대폭 딜레이 (기존 0.4초 -> 1.2초)
    log.innerHTML += `<h3>STEP 1. 식현상(Transit) 분석</h3>`;
    log.innerHTML += `<span style="color: #ff9900;">🎯 목표: 가상 행성의 반지름(Rp) 구하기</span><br>`;
    await sleep(1200);
    const radius = Math.sqrt(transit) * 109 * starRadius;
    log.innerHTML += `👉 <strong>Rp = ${radius.toFixed(2)} 지구반지름 (R_Earth)</strong><hr>`;

    log.innerHTML += `<h3>STEP 2. 도플러 효과(시선속도) 분석</h3>`;
    log.innerHTML += `<span style="color: #ff9900;">🎯 목표: 가상 행성의 질량(Mp) 구하기</span><br>`;
    await sleep(1200);
    const mass = doppler * Math.pow(period/365, 1/3) * Math.pow(starMass, 2/3) / 0.09;
    log.innerHTML += `👉 <strong>Mp = ${mass.toFixed(2)} 지구질량 (M_Earth)</strong><hr>`;

    log.innerHTML += `<h3>STEP 3. 케플러 제3법칙 적용</h3>`;
    log.innerHTML += `<span style="color: #ff9900;">🎯 목표: 가상 행성의 공전 궤도 반경(a) 구하기</span><br>`;
    await sleep(1200);
    const orbit = Math.pow(starMass * Math.pow(period/365, 2), 1/3);
    log.innerHTML += `👉 <strong>a = ${orbit.toFixed(2)} AU</strong><hr>`;

    log.innerHTML += `<h3>STEP 4. 행성 평균 밀도 계산</h3>`;
    log.innerHTML += `<span style="color: #ff9900;">🎯 목표: 가상 행성의 구성 성분 추정</span><br>`;
    await sleep(1200);
    const density = mass / Math.pow(radius, 3);
    log.innerHTML += `👉 <strong>ρ = ${density.toFixed(3)} 지구밀도 (ρ_Earth)</strong><hr>`;

    log.innerHTML += `<h3>STEP 5. 항성 복사 에너지량 계산</h3>`;
    log.innerHTML += `<span style="color: #ff9900;">🎯 목표: 행성이 받는 별빛 세기(S) 구하기</span><br>`;
    await sleep(1200);
    const insol = starLum / (orbit * orbit);
    log.innerHTML += `👉 <strong>S = ${insol.toFixed(2)} 지구복사량 (S_Earth)</strong><hr>`;

    log.innerHTML += `<h3>STEP 6. 행성 평형 온도 유도</h3>`;
    log.innerHTML += `<span style="color: #ff9900;">🎯 목표: 행성의 대기 평형 온도(T) 추정</span><br>`;
    await sleep(1200);
    const temp = 278 * Math.pow(insol * 0.7, 0.25);
    log.innerHTML += `👉 <strong>T = ${temp.toFixed(0)} K</strong><hr>`;

    document.getElementById("planetRadius").innerText = radius.toFixed(2) + " R_Earth";
    document.getElementById("planetMass").innerText = mass.toFixed(2) + " M_Earth";
    document.getElementById("orbitRadius").innerText = orbit.toFixed(2) + " AU";
    document.getElementById("density").innerText = density.toFixed(2) + " ρ_Earth";
    document.getElementById("insolation").innerText = insol.toFixed(2) + " S_Earth";
    document.getElementById("equilibrium").innerText = temp.toFixed(0) + " K";

    // 💡 계산 완료 테이블 오픈 전 대기시간 증폭 (기존 0.6초 -> 2초)
    await sleep(2000);
    activateSection('sec-result');
    
    // 💡 거주성 평가단 카드로 전이하기 직전 싱크 제어 딜레이 (기존 0.6초 -> 2.5초)
    await sleep(2500);
    calculateHabitability(radius, mass, orbit, density, insol, temp);
}

// 거주 가능성 평가 및 하위 그래픽 카드 체인 개방
async function calculateHabitability(radius, mass, orbit, density, insol, temp){
    let score = 100;
    let reason = [];

    if(radius > 2){ score -= 20; reason.push("행성 크기가 커서 가스행성일 가능성"); }
    if(density < 0.5){ score -= 20; reason.push("밀도가 낮아 암석형 행성이 아닐 가능성"); }
    if(insol < 0.35 || insol > 1.75){ score -= 30; reason.push("골디락스존 밖에 위치"); }
    if(temp < 180){ score -= 20; reason.push("평형온도가 너무 낮음"); }
    if(temp > 320){ score -= 20; reason.push("평형온도가 너무 높음"); }

    const currentStarSpec = generatedPlanetData ? generatedPlanetData.st_spectype : "G";

    if (currentStarSpec === "M") {
        if (generatedPlanetData && generatedPlanetData.isIdeal && score < 50) {
            score = Math.floor(Math.random() * (100 - 50) + 50);
            reason = ["M형 왜성 골디락스 존 안착", "안정적인 암석형 구조 관측"];
        }
    } else {
        if (score > 40) {
            score = 40;
            reason = [`부모 항성이 ${currentStarSpec}형임: 강력한 고에너지 플레어 위험군`, "대기 및 자기장 보존 불리 (최대 거주성 제한)"];
        }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    
    let level = "낮음";
    if(score >= 80) level = "높음";
    else if(score >= 50) level = "보통";

    document.getElementById("habitabilityScore").innerText = score + "%";
    document.getElementById("habitabilityLevel").innerText = "거주 가능성 : " + level;
    if(reason.length === 0) reason.push("거주 가능성 조건 충족");
    document.getElementById("habitabilityReason").innerHTML = reason.join("<br>");

    finalCalculatedData = {
        starName: generatedPlanetData.hostname || "Unknown Star",
        starSpec: currentStarSpec,
        starMass: generatedPlanetData.st_mass || 1.0,
        starRadius: generatedPlanetData.st_rad || 1.0,
        starTemp: generatedPlanetData.st_teff || 5778,
        planetRadius: parseFloat(radius.toFixed(2)),
        planetMass: parseFloat(mass.toFixed(2)),
        orbitRadius: parseFloat(orbit.toFixed(2)),
        density: parseFloat(density.toFixed(3)),
        insolation: parseFloat(insol.toFixed(2)),
        equilibriumTemp: Math.round(temp),
        score: score,
        level: level,
        timestamp: new Date().toISOString()
    };

    // 5단계: 거주 가능성 평가 섹션 오픈
    activateSection('sec-habitability');
    
    // 💡 3D 시뮬레이션 및 HUD 오픈 전 딜레이 대폭 확장 (기존 0.8초 -> 3초)
    await sleep(3000);

    // 컴포넌트 데이터 바인딩 렌더링 호출
    if (typeof updateThreeJSScene === "function") {
        updateThreeJSScene(radius, density, temp, score, generatedPlanetData.st_rad, generatedPlanetData.starLum, orbit, generatedPlanetData.st_teff);
    }
    if (typeof update2DHUD === "function") {
        update2DHUD(radius, mass, orbit, temp, density);
    }
    if (typeof createAlien === "function") {
        createAlien(score, density, temp, mass);
    }
    if (typeof setupTerraform === "function") {
        setupTerraform(radius, mass, orbit);
    }

    // 6단계: 3D 시뮬레이션 및 HUD 오픈
    activateSection('sec-simulation');

    if (renderer) {
        const container = document.getElementById("canvas-container");
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    // 💡 학계 등록 마지막 섹션 오픈 딜레이 제어 (기존 0.8초 -> 2.5초)
    await sleep(2500);

    // 7단계: 마지막 행성 명명 및 학계 등록 오픈
    activateSection('sec-save');
}

function update2DHUD(radius, mass, orbit, temp, density) {
    document.getElementById("hudMass").innerText = mass.toFixed(2) + " 지구질량 (M_Earth)";
    document.getElementById("hudRadius").innerText = radius.toFixed(2) + " 지구반지름 (R_Earth)";
    document.getElementById("hudOrbit").innerText = orbit.toFixed(2) + " AU";
    document.getElementById("hudTemp").innerText = temp.toFixed(0) + " K";
    document.getElementById("hudExoName").innerText = `${generatedPlanetData.pl_name} (${radius.toFixed(1)} 배)`;

    const exoCircle = document.getElementById("hudExoCircle");
    if(exoCircle) {
        let targetPixelSize = Math.max(10, Math.min(100, 30 * radius));
        exoCircle.style.width = targetPixelSize + "px";
        exoCircle.style.height = targetPixelSize + "px";
        if (temp < 220) exoCircle.style.background = "radial-gradient(circle at 30% 30%, #e0ffff, #4682b4)";
        else if (temp > 330) exoCircle.style.background = "radial-gradient(circle at 30% 30%, #ff4500, #8b0000)";
        else if (density > 1.5) exoCircle.style.background = "radial-gradient(circle at 30% 30%, #a9a9a9, #555555)";
        else exoCircle.style.background = "radial-gradient(circle at 30% 30%, #7bed9f, #2ed573)";
    }
}

function createAlien(score, density, temp, mass){
    const alien = document.getElementById("alien");
    if(!alien) return;
    if(score < 60){
        alien.innerHTML = `<span style="font-size: 1.1rem; color: #aaa;">생명체 존재 가능성이 낮습니다.</span>`;
        return;
    }
    let body = "👽", desc = [];
    if(temp < 220){ desc.push("저온 환경 적응 생명체"); body += "❄️"; }
    if(temp > 300){ desc.push("고온 임계 압축 적응"); body += "🔥"; }
    if(density > 1.5){ desc.push("고밀도 중력 골격 발달"); body += "💪"; }
    if(mass < 1){ desc.push("저중력 대기 부유 구조"); body += "🪶"; }
    if(desc.length === 0) desc.push("지구형 표준 생태 환경 생명체");

    alien.innerHTML = `<div style="text-align: center; width: 100%;"><div style="font-size: 50px; margin-bottom: 10px;">${body}</div><div style="font-size: 1.1rem; color: #e28743;"><strong>가상 진화 특징</strong><br><span style="color: #ccc; font-size: 0.95rem;">${desc.join("<br>")}</span></div></div>`;
}

function setupTerraform(radius, mass, orbit){
    const massSlider = document.getElementById("massSlider");
    const orbitSlider = document.getElementById("orbitSlider");
    const albedoSlider = document.getElementById("albedoSlider");
    if(!massSlider || !orbitSlider || !albedoSlider) return;

    massSlider.value = mass; orbitSlider.value = orbit; albedoSlider.value = 0.3;
    document.getElementById("massValue").innerText = parseFloat(mass).toFixed(2);
    document.getElementById("orbitValue").innerText = parseFloat(orbit).toFixed(2);
    document.getElementById("albedoValue").innerText = "0.30";

    massSlider.oninput = () => document.getElementById("massValue").innerText = parseFloat(massSlider.value).toFixed(2);
    orbitSlider.oninput = () => document.getElementById("orbitValue").innerText = parseFloat(orbitSlider.value).toFixed(2);
    albedoSlider.oninput = () => document.getElementById("albedoValue").innerText = parseFloat(albedoSlider.value).toFixed(2);

    document.getElementById("simulateBtn").onclick = () => {
        let newOrbit = parseFloat(orbitSlider.value);
        let albedo = parseFloat(albedoSlider.value);
        let insol = generatedPlanetData.starLum / (newOrbit * newOrbit);
        let temp = 278 * Math.pow(insol * (1 - albedo), 0.25);
        alert(`가상 행성 테라포밍 완료!\n\n새 복사량 : ${insol.toFixed(2)} S⊕\n새 평형온도 : ${temp.toFixed(0)} K`);
    };
}

function updateThreeJSScene(radius, density, temp, score, starRad, starLum, orbit, starTemp) {
    if (!scene) return;

    if (starMesh) scene.remove(starMesh);
    if (planetMesh) scene.remove(planetMesh);
    if (orbitLineMesh) scene.remove(orbitLineMesh);
    if (goldilocksMesh) scene.remove(goldilocksMesh);

    const scaleFactor = 20; 
    currentOrbitRadiusPx = orbit * scaleFactor;

    let starColor = 0xffaa00; 
    if (starTemp >= 7500) starColor = 0xadc7ff;      
    else if (starTemp >= 6000) starColor = 0xf8f7ff; 
    else if (starTemp >= 5200) starColor = 0xfff4ea; 
    else if (starTemp >= 3700) starColor = 0xffddb4; 
    else starColor = 0xffb3a7;                       

    const starGeo = new THREE.SphereGeometry(Math.max(1.5, starRad * 2), 32, 32);
    const starMat = new THREE.MeshBasicMaterial({ color: starColor });
    starMesh = new THREE.Mesh(starGeo, starMat);
    scene.add(starMesh);

    const hzInner = Math.sqrt(starLum / 1.1) * scaleFactor;
    const hzOuter = Math.sqrt(starLum / 0.53) * scaleFactor;
    
    const hzGeo = new THREE.RingGeometry(hzInner, hzOuter, 64);
    hzGeo.rotateX(Math.PI / 2); 
    const hzMat = new THREE.MeshBasicMaterial({ 
        color: 0x2ecc71, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.15  
    });
    goldilocksMesh = new THREE.Mesh(hzGeo, hzMat);
    scene.add(goldilocksMesh);

    const orbitGeo = new THREE.RingGeometry(currentOrbitRadiusPx - 0.05, currentOrbitRadiusPx + 0.05, 64);
    orbitGeo.rotateX(Math.PI / 2);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
    orbitLineMesh = new THREE.Mesh(orbitGeo, orbitMat);
    scene.add(orbitLineMesh);

    let planetColor = 0x7bed9f; 
    if (temp < 220) planetColor = 0x74b9ff;      
    else if (temp > 330) planetColor = 0xff7675; 
    else if (density > 1.5) planetColor = 0xb2bec3; 

    const planetGeo = new THREE.SphereGeometry(Math.max(0.4, radius * 0.5), 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({ 
        color: planetColor,
        roughness: 0.6,
        metalness: 0.1
    });
    planetMesh = new THREE.Mesh(planetGeo, planetMat);
    
    planetMesh.position.x = currentOrbitRadiusPx;
    scene.add(planetMesh);

    if (controls) controls.target.set(0, 0, 0);
}

// ==========================================
// 💾 우주 데이터베이스 저장 및 실시간 필터 적용
// ==========================================
function savePlanetToFirebase() {
    const classInfo = document.getElementById("studentClassInfo").value.trim();
    const studentName = document.getElementById("studentNameInfo").value.trim();
    const inputName = document.getElementById("customPlanetName").value.trim();
    const statusText = document.getElementById("saveStatus");

    if (!finalCalculatedData.starName) {
        alert("먼저 가상 행성을 생성해 주세요!");
        return;
    }
    if (!classInfo || !studentName) {
        alert("반, 번호와 탐사자 이름을 모두 입력해 주세요(상품 제공 목적입니다).");
        return;
    }
    if (!inputName) {
        alert("행성의 이름을 입력해 주세요!");
        return;
    }

    // 💡 [필터 가동] 유저가 입력한 커스텀 행성 이름 검증[cite: 8]
    const cleanedPlanetName = validateAndCleanName(inputName, true);

    if (cleanedPlanetName === false) {
        alert("⚠️ 행성 이름에 부적절한 단어, 비속어 또는 허용되지 않는 특수문자가 포함되어 있습니다. 정돈된 학술명 형식으로 명명해 주세요!");
        statusText.innerText = "❌ 학술 보안 위반: 등록이 거부되었습니다.";
        statusText.style.color = "#ff3300";
        return;
    }

    statusText.innerText = "⚡ 우주 데이터베이스 전송 중...";
    statusText.style.color = "#ff9900";

    // 실제 데이터 필드 주입 및 구조 정제
    finalCalculatedData.customName = cleanedPlanetName;
    finalCalculatedData.explorerClass = classInfo;
    finalCalculatedData.explorerName = studentName;

    // Firebase Realtime Database 노드 전송[cite: 2, 8]
    database.ref('discovered_planets').push(finalCalculatedData)
        .then(() => {
            statusText.innerText = `🎉 성공적으로 등록되었습니다! [등록명: ${cleanedPlanetName} / 탐사자: ${studentName}]`;
            statusText.style.color = "#2ecc71";
            
            document.getElementById("customPlanetName").value = ""; 
        })
        .catch((error) => {
            console.error("데이터 저장 실패:", error);
            statusText.innerText = "❌ 데이터베이스 통신 에러가 발생했습니다.";
            statusText.style.color = "#ff3300";
        });
}