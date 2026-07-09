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
    let clean = name.trim().replace(/\s+/g, ' ');

    const forbiddenKeywords = [
        "fuck", "shit", "bitch", "asshole", "fck", "test", 
        "시발", "ㅅㅂ", "개새끼", "존나", "쓰레기", "성소휘", "엉덩이","ㅆㅂ","ㅅㅂ","쓰바","쌰바"
    ];

    const lowerClean = clean.toLowerCase();
    const hasForbidden = forbiddenKeywords.some(keyword => lowerClean.includes(keyword));
    const pattern = isUserCustom ? /^[a-zA-Z0-9가-힣\s\-\.]+$/ : /^[a-zA-Z0-9\s\-\.]+$/;

    if (hasForbidden || !pattern.test(clean) || clean.length < 1) {
        return false;
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
    document.getElementById("live-alien-dancer").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    initThreeJS();
    document.getElementById("startBtn").addEventListener("click", generateVirtualSystem);
    document.getElementById("saveDbBtn").addEventListener("click", savePlanetToFirebase);
});

function initThreeJS() {
    const container = document.getElementById("canvas-container");
    if(!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(40, 25, 40);

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

function generateVirtualSystem() {
    resetSections();

    let st_mass = parseFloat((Math.random() * (1.5 - 0.4) + 0.4).toFixed(2));
    let st_rad = parseFloat((st_mass * (Math.random() * (1.2 - 0.8) + 0.8)).toFixed(2));
    let st_teff = Math.round(5000 * Math.pow(st_mass, 0.5) * (Math.random() * (1.1 - 0.9) + 0.9));
    let starLum = Math.pow(st_rad, 2) * Math.pow(st_teff / 5778, 4);

    let raw_pl_name = "VIR-" + Math.floor(Math.random() * 9000 + 1000) + " b";
    let pl_name = validateAndCleanName(raw_pl_name, false) || "VIR-1000 b";
    let hostname = pl_name.split(' ')[0];

    let st_spectype = "G";
    if(st_teff >= 7500) st_spectype = "A";
    else if(st_teff >= 6000) st_spectype = "F";
    else if(st_teff >= 5200) st_spectype = "G";
    else if(st_teff >= 3700) st_spectype = "K";
    else st_spectype = "M";

    let target_orbit = parseFloat((Math.sqrt(starLum) * (Math.random() * (1.1 - 0.9) + 0.9)).toFixed(2)); 
    if (target_orbit < st_rad * 0.05) target_orbit = parseFloat((st_rad * 0.1).toFixed(2));

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
    activateSection('sec-observation');

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

async function calculatePlanet(){
    const log = document.getElementById("calculationLog");
    log.innerHTML = `<h3>🔭 가상 데이터 분석 시스템 가동</h3><hr>`;

    const d = generatedPlanetData;
    const starRadius = d.st_rad;
    const starMass = d.st_mass;
    const starLum = d.starLum;
    const transit = d.transit;
    const period = d.pl_orbper;
    const doppler = d.doppler;

    log.innerHTML += `<h3>STEP 1. 식현상 분석</h3>`;
    await sleep(1200);
    const radius = Math.sqrt(transit) * 109 * starRadius;
    log.innerHTML += `👉 <strong>Rp = ${radius.toFixed(2)} R_Earth</strong><hr>`;

    log.innerHTML += `<h3>STEP 2. 도플러 효과 분석</h3>`;
    await sleep(1200);
    const mass = doppler * Math.pow(period/365, 1/3) * Math.pow(starMass, 2/3) / 0.09;
    log.innerHTML += `👉 <strong>Mp = ${mass.toFixed(2)} M_Earth</strong><hr>`;

    log.innerHTML += `<h3>STEP 3. 케플러 제3법칙 적용</h3>`;
    await sleep(1200);
    const orbit = Math.pow(starMass * Math.pow(period/365, 2), 1/3);
    log.innerHTML += `👉 <strong>a = ${orbit.toFixed(2)} AU</strong><hr>`;

    log.innerHTML += `<h3>STEP 4. 행성 평균 밀도 계산</h3>`;
    await sleep(1200);
    const density = mass / Math.pow(radius, 3);
    log.innerHTML += `👉 <strong>ρ = ${density.toFixed(3)} ρ_Earth</strong><hr>`;

    log.innerHTML += `<h3>STEP 5. 항성 복사 에너지량 계산</h3>`;
    await sleep(1200);
    const insol = starLum / (orbit * orbit);
    log.innerHTML += `👉 <strong>S = ${insol.toFixed(2)} S_Earth</strong><hr>`;

    log.innerHTML += `<h3>STEP 6. 행성 평형 온도 유도</h3>`;
    await sleep(1200);
    const temp = 278 * Math.pow(insol * 0.7, 0.25);
    log.innerHTML += `👉 <strong>T = ${temp.toFixed(0)} K</strong><hr>`;

    document.getElementById("planetRadius").innerText = radius.toFixed(2) + " R_Earth";
    document.getElementById("planetMass").innerText = mass.toFixed(2) + " M_Earth";
    document.getElementById("orbitRadius").innerText = orbit.toFixed(2) + " AU";
    document.getElementById("density").innerText = density.toFixed(2) + " ρ_Earth";
    document.getElementById("insolation").innerText = insol.toFixed(2) + " S_Earth";
    document.getElementById("equilibrium").innerText = temp.toFixed(0) + " K";

    await sleep(2000);
    activateSection('sec-result');
    
    await sleep(2500);
    calculateHabitability(radius, mass, orbit, density, insol, temp);
}

// ==========================
// 거주 가능성 평가 및 그래픽 인터페이스 연동 (비율 및 조건 완벽 적용)
// ==========================
// ==========================
// 거주 가능성 평가 및 그래픽 인터페이스 연동 (최신 조합 조건 반영)
// ==========================
// ==========================
// 거주 가능성 평가 및 그래픽 인터페이스 연동 (온도 점수 표기 추가)
// ==========================
// ==========================
// 거주 가능성 평가 및 그래픽 인터페이스 연동 (모든 물리량 세부 점수 표기 버전)
// ==========================
// ==========================
// 거주 가능성 평가 및 그래픽 인터페이스 연동 (UI 왼쪽 정렬 보정 버전)
// ==========================
async function calculateHabitability(radius, mass, orbit, density, insol, temp){
    // 텍스트 전체를 정렬하기 위해, 시작할 때 스타일이 들어간 감싸는 div 태그를 넣어줍니다.
    let reason = ["<div style='text-align: left; max-width: 450px; margin: 0 auto; line-height: 1.6; font-size: 0.95rem;'>"];
    
    let starSpec = "G";
    if (typeof generatedPlanetData !== "undefined" && generatedPlanetData) {
        starSpec = generatedPlanetData.st_spectype || "G"; 
    } else if (typeof currentPlanet !== "undefined" && currentPlanet) {
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

    // 감싸는 div 태그를 닫아줍니다.
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
    
    // 조립된 세부 리스트 로그를 화면에 주입 (줄바꿈 <br> 처리 제거 후 자연스럽게 연결)
    document.getElementById("habitabilityReason").innerHTML = reason.join("<br>").replace(/<br><div/g, "<div").replace(/<\/div><br>/g, "</div>");

    // 이후 시뮬레이션 인터페이스 코드 연동은 기존과 동일
    activateSection('sec-habitability');
    
    if (typeof finalCalculatedData !== "undefined") {
        finalCalculatedData = {
            starName: generatedPlanetData ? (generatedPlanetData.hostname || "Unknown Star") : (currentPlanet.pl_name || "Unknown Star"),
            starSpec: starSpec,
            starMass: generatedPlanetData ? generatedPlanetData.st_mass : currentPlanet.st_mass,
            starRadius: generatedPlanetData ? generatedPlanetData.st_rad : currentPlanet.st_rad,
            starTemp: generatedPlanetData ? generatedPlanetData.st_teff : currentPlanet.st_teff,
            planetRadius: parseFloat(radius.toFixed(2)),
            planetMass: parseFloat(mass.toFixed(2)),
            orbitRadius: parseFloat(orbit.toFixed(2)),
            density: parseFloat(density.toFixed(3)),
            insolation: parseFloat(insol.toFixed(2)),
            equilibriumTemp: Math.round(temp),
            score: parseFloat(displayScore),
            level: level,
            timestamp: new Date().toISOString()
        };
    }

    let hasAlien = total_score >= 80;
    let chosenAlienNum = 0;

    if (hasAlien) {
        chosenAlienNum = Math.floor(Math.random() * 7) + 1;
        const alienDancerBox = document.getElementById("live-alien-dancer");
        const alienImgTag = document.getElementById("live-alien-img");
        
        if (alienDancerBox && alienImgTag) {
            alienDancerBox.style.position = "fixed";  
            alienDancerBox.style.top = "40px";         
            alienDancerBox.style.left = "50%";         
            alienDancerBox.style.transform = "translateX(-50%)"; 
            alienDancerBox.style.zIndex = "9999";      
            alienImgTag.src = `외계인폴더/외계인${chosenAlienNum}.png`;
            alienDancerBox.style.display = "block";
        }
        if (typeof finalCalculatedData !== "undefined") {
            finalCalculatedData.hasAlien = hasAlien;
            finalCalculatedData.alienNumber = chosenAlienNum;
        }
    } else {
        const alienDancerBox = document.getElementById("live-alien-dancer");
        if (alienDancerBox) alienDancerBox.style.display = "none";
    }

    if (typeof sleep === "function") await sleep(3000);

    let finalStarRad = generatedPlanetData ? generatedPlanetData.st_rad : currentPlanet.st_rad;
    let finalStarLum = generatedPlanetData ? generatedPlanetData.starLum : (Math.pow(currentPlanet.st_rad, 2) * Math.pow(currentPlanet.st_teff/5778, 4));
    let finalStarTemp = generatedPlanetData ? generatedPlanetData.st_teff : currentPlanet.st_teff;

    if (typeof updateThreeJSScene === "function") {
        updateThreeJSScene(radius, density, temp, total_score, finalStarRad, finalStarLum, orbit, finalStarTemp);
    }
    if (typeof update2DHUD === "function") {
        update2DHUD(radius, mass, orbit, temp, density);
    }

    activateSection('sec-simulation');

    if (renderer) {
        const container = document.getElementById("canvas-container");
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    if (typeof sleep === "function") await sleep(2500);
    activateSection('sec-save');
}
// ==========================================
// 3D 그래픽 엔진 (항성-행성 겹침 수정 버전)
// ==========================================
// ==========================================
// 2D HUD 정보 표시 함수 (HTML 구조 일치화 완료)
// ==========================================
function update2DHUD(radius, mass, orbit, temp, density) {
    // virtual.html에 정의된 정확한 ID인 hudMass, hudRadius 등으로 데이터를 주입합니다.
    if (document.getElementById("hudRadius")) {
        document.getElementById("hudRadius").innerText = radius.toFixed(2) + " R_Earth";
    }
    if (document.getElementById("hudMass")) {
        document.getElementById("hudMass").innerText = mass.toFixed(2) + " M_Earth";
    }
    if (document.getElementById("hudOrbit")) {
        document.getElementById("hudOrbit").innerText = orbit.toFixed(2) + " AU";
    }
    if (document.getElementById("hudTemp")) {
        document.getElementById("hudTemp").innerText = Math.round(temp) + " K";
    }

    // 2D 크기 비교 스케일 원 크기 및 텍스트 반영
    const exoCircle = document.getElementById("hudExoCircle");
    const exoName = document.getElementById("hudExoName");
    if (exoCircle && exoName) {
        // 기본 지구 크기(30px) 대비 반지름 비율로 크기 조정 (최대 70px 제한)
        let visualSize = Math.max(10, Math.min(70, 30 * radius));
        exoCircle.style.width = visualSize + "px";
        exoCircle.style.height = visualSize + "px";
        exoName.innerText = `외계행성 (${radius.toFixed(2)} R_Earth)`;
    }
}

// ==========================================
// 3D 그래픽 엔진 (궤도 장반경 제한 전면 해제 버전)
// ==========================================
function updateThreeJSScene(radius, density, temp, score, starRad, starLum, orbit, starTemp) {
    if (!scene) return;

    if (starMesh) scene.remove(starMesh);
    if (planetMesh) scene.remove(planetMesh);
    if (orbitLineMesh) scene.remove(orbitLineMesh);
    if (goldilocksMesh) scene.remove(goldilocksMesh);

    // 1. 항성 크기 시각화 보정
    const scaleFactor = 35; 
    let visualStarRad = starRad * 1.5; 
    visualStarRad = Math.max(1.0, Math.min(3.5, visualStarRad)); 

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

    // 🚀 [궤도 제한 해제] 기존의 최소값 제한(if문)을 완전히 제거했습니다.
    // 실제 입력된 궤도 반경(AU) 데이터 그대로 항성 바짝 옆까지 접근 가능합니다.
    currentOrbitRadiusPx = orbit * scaleFactor;

    // 2. 골디락스 존 (Ring) 생성
    const hzInner = Math.sqrt(starLum / 1.1) * scaleFactor;
    const hzOuter = Math.sqrt(starLum / 0.53) * scaleFactor;
    
    const hzGeo = new THREE.RingGeometry(Math.max(0.1, hzInner), hzOuter, 64);
    hzGeo.rotateX(Math.PI / 2); 
    const hzMat = new THREE.MeshBasicMaterial({ 
        color: 0x2ecc71, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.15  
    });
    goldilocksMesh = new THREE.Mesh(hzGeo, hzMat);
    scene.add(goldilocksMesh);

    // 3. 실제 행성 궤도선 생성
    const orbitGeo = new THREE.RingGeometry(
        Math.max(0.01, currentOrbitRadiusPx - 0.08), 
        currentOrbitRadiusPx + 0.08, 
        64
    );
    orbitGeo.rotateX(Math.PI / 2);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
    orbitLineMesh = new THREE.Mesh(orbitGeo, orbitMat);
    scene.add(orbitLineMesh);

    // 4. 행성 데이터 기반 색상 및 크기 설정
    let planetColor = 0x7bed9f; 
    if (temp < 220) planetColor = 0x74b9ff;      
    else if (temp > 330) planetColor = 0xff7675; 
    else if (density > 1.5) planetColor = 0xb2bec3; 

    const planetGeo = new THREE.SphereGeometry(Math.max(0.3, radius * 0.35), 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({ 
        color: planetColor,
        roughness: 0.6,
        metalness: 0.1
    });
    planetMesh = new THREE.Mesh(planetGeo, planetMat);
    
    // 계산된 제한 없는 궤도 위치에 행성 배치
    planetMesh.position.x = currentOrbitRadiusPx;
    scene.add(planetMesh);

    if (controls) controls.target.set(0, 0, 0);
}

// ==========================================
// 🚀 데이터베이스 저장 기능
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
        alert("반, 번호와 탐사자 이름을 모두 입력해 주세요.");
        return;
    }
    if (!inputName) {
        alert("행성의 이름을 입력해 주세요!");
        return;
    }

    const cleanedPlanetName = validateAndCleanName(inputName, true);

    if (cleanedPlanetName === false) {
        alert("⚠️ 행성 이름에 부적절한 단어, 비속어 또는 허용되지 않는 특수문자가 포함되어 있습니다.");
        statusText.innerText = "❌ 등록이 거부되었습니다.";
        statusText.style.color = "#ff3300";
        return;
    }

    statusText.innerText = "⚡ 우주 데이터베이스 전송 중...";
    statusText.style.color = "#ff9900";

    finalCalculatedData.customName = cleanedPlanetName;
    finalCalculatedData.explorerClass = classInfo;
    finalCalculatedData.explorerName = studentName;

    database.ref('discovered_planets').push(finalCalculatedData)
        .then(() => {
            statusText.innerText = `🎉 성공적으로 등록되었습니다! [등록명: ${cleanedPlanetName}]`;
            statusText.style.color = "#2ecc71";
            document.getElementById("customPlanetName").value = ""; 
        })
        .catch((error) => {
            console.error("데이터 저장 실패:", error);
            statusText.innerText = "❌ 데이터베이스 통신 에러가 발생했습니다.";
            statusText.style.color = "#ff3300";
        });
}
