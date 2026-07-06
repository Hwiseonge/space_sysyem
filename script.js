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
async function startSimulation(){
    resetSections();

    document.getElementById("calculationLog").innerHTML = "";
    document.getElementById("planetRadius").innerText = "???";
    document.getElementById("planetMass").innerText = "???";
    document.getElementById("orbitRadius").innerText = "???";
    document.getElementById("density").innerText = "???";
    document.getElementById("insolation").innerText = "???";
    document.getElementById("equilibrium").innerText = "???";
    document.getElementById("habitabilityScore").innerText = "0%";
    document.getElementById("habitabilityLevel").innerText = "평가 대기";
    document.getElementById("habitabilityReason").innerHTML = "";
    
    const alienBox = document.getElementById("alien");
    if(alienBox) alienBox.innerHTML = "생명체 분석 대기";

    if(planets.length === 0){
        alert("데이터가 로드되지 않았습니다.");
        return;
    }

    const random = Math.floor(Math.random() * planets.length);
    currentPlanet = planets[random];

    // 관측 원시 데이터 세팅 및 노출
    displayObservationData();
    activateSection('sec-observation');

    // 💡 1단계 이후 역산 분석 카드 오픈까지의 시간 연장 (기존 1초 -> 2.5초)
    setTimeout(async () => {
        activateSection('sec-calculation');
        await calculatePlanet();
    }, 2500);
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
    log.innerHTML += `<h3>STEP 5. 항성 복사 에너지량(Insolation) 계산</h3>`;
    log.innerHTML += `<span style="color: #00ffcc;">🎯 목표: 행성이 받는 별빛의 세기(S) 구하기</span><br>`;
    log.innerHTML += `기본 원리: 거리 제곱 역비례 법칙 (S = L / a²)<br><br>`;
    await sleep(1200);
    const insol = starLum / (orbit * orbit);
    log.innerHTML += `계산식: S = 항성광도 / 궤도반경²<br>`;
    log.innerHTML += `👉 <strong>S = ${insol.toFixed(2)} 지구복사량 (S_Earth)</strong><hr>`;

    // STEP 6
    log.innerHTML += `<h3>STEP 6. 행성 평형 온도(Equilibrium Temperature) 유도</h3>`;
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
async function calculateHabitability(radius, mass, orbit, density, insol, temp){
    let score = 100;
    let reason = [];

    if(radius > 2){ score -= 20; reason.push("행성 크기가 커서 가스행성일 가능성"); }
    if(density < 0.5){ score -= 20; reason.push("밀도가 낮아 암석형 행성이 아닐 가능성"); }
    if(insol < 0.35 || insol > 1.75){ score -= 30; reason.push("골디락스존 밖에 위치"); }
    if(temp < 180){ score -= 20; reason.push("평형온도가 너무 낮음"); }
    if(temp > 320){ score -= 20; reason.push("평형온도가 너무 높음"); }

    score = Math.max(0, Math.min(100, Math.round(score)));
    let level = "낮음";
    if(score >= 80) level = "높음";
    else if(score >= 50) level = "보통";

    document.getElementById("habitabilityScore").innerText = score + "%";
    document.getElementById("habitabilityLevel").innerText = "거주 가능성 : " + level;

    if(reason.length === 0) reason.push("거주 가능성 조건 충족");
    document.getElementById("habitabilityReason").innerHTML = reason.join("<br>");

    // 거주 가능성 패널 활성화
    activateSection('sec-habitability');
    
    // 💡 최종 3D 엔진과 실시간 HUD 구동 연출 전 딜레이 증가 (기존 0.8초 -> 3초)
    await sleep(3000);

    const starRadius = parseFloat(currentPlanet.st_rad);
    const starTemp = parseFloat(currentPlanet.st_teff);
    const starLum = Math.pow(starRadius, 2) * Math.pow(starTemp/5778, 4);
    
    // 3D 뷰어 엔진 업데이트
    updateThreeJSScene(radius, density, temp, score, starRadius, starLum, orbit, starTemp);
    // 2D HUD 정보창 업데이트 추가 호출
    update2DHUD(radius, mass, orbit, temp, density);

    // 부가 컴포넌트 호출 안전장치 처리
    if (typeof createAlien === "function") createAlien(score, density, temp, mass);
    if (typeof setupTerraform === "function") setupTerraform(radius, mass, orbit);

    // 6단계: 3D 시뮬레이터 및 실시간 HUD 활성화
    activateSection('sec-simulation');

    // 리사이즈 갱신을 통해 찌그러진 Three.js 종횡비 수리
    if (renderer) {
        const container = document.getElementById("canvas-container");
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

// ==========================================
// 3D 그래픽 엔진 컬러 및 메시 실시간 매핑
// ==========================================
function updateThreeJSScene(radius, density, temp, score, starRadius, starLum, orbit, starTemp) {
    if (!scene) return;

    if (starMesh) scene.remove(starMesh);
    if (planetMesh) scene.remove(planetMesh);
    if (orbitLineMesh) scene.remove(orbitLineMesh);
    if (goldilocksMesh) scene.remove(goldilocksMesh);

    let starColor = 0xffaa00; 
    if (starTemp >= 7500) starColor = 0xa5c9ff;      
    else if (starTemp >= 6000) starColor = 0xffffff; 
    else if (starTemp >= 5200) starColor = 0xfff4e8; 
    else if (starTemp < 3700) starColor = 0xff3300;  

    let sRadiusPx = starRadius * 3;
    sRadiusPx = Math.max(2, Math.min(6, sRadiusPx)); 
    
    const starGeo = new THREE.SphereGeometry(sRadiusPx, 32, 32);
    const starMat = new THREE.MeshBasicMaterial({ color: starColor });
    starMesh = new THREE.Mesh(starGeo, starMat);
    scene.add(starMesh);

    const hzInnerAU = 0.75 * Math.sqrt(starLum);
    const hzOuterAU = 1.5 * Math.sqrt(starLum);
    const auScale = 12; 

    const goldilocksGeo = new THREE.RingGeometry(hzInnerAU * auScale, hzOuterAU * auScale, 64);
    const goldilocksMat = new THREE.MeshBasicMaterial({ 
        color: 0x2ecc71, side: THREE.DoubleSide, transparent: true, opacity: 0.12 
    });
    goldilocksMesh = new THREE.Mesh(goldilocksGeo, goldilocksMat);
    goldilocksMesh.rotation.x = Math.PI / 2; 
    scene.add(goldilocksMesh);

    currentOrbitRadiusPx = orbit * auScale;
    currentOrbitRadiusPx = Math.max(sRadiusPx + 4, Math.min(50, currentOrbitRadiusPx)); 

    const orbitPoints = [];
    for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * currentOrbitRadiusPx, 0, Math.sin(theta) * currentOrbitRadiusPx));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
    orbitLineMesh = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLineMesh);

    let planetColor = 0x2ecc71; 
    if (temp < 220) planetColor = 0x8cd3ff;       
    else if (temp > 330) planetColor = 0xff4500;  
    else if (density > 1.5) planetColor = 0x8a9a86; 

    let pRadiusPx = radius * 0.4;
    pRadiusPx = Math.max(0.5, Math.min(2.5, pRadiusPx));

    const planetGeo = new THREE.SphereGeometry(pRadiusPx, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({ color: planetColor, roughness: 0.5, metalness: 0.2 });
    planetMesh = new THREE.Mesh(planetGeo, planetMat);
    
    planetMesh.position.x = currentOrbitRadiusPx;
    scene.add(planetMesh);

    if (orbit >= hzInnerAU && orbit <= hzOuterAU) {
        orbitMat.color.setHex(0x2ecc71);
        orbitMat.opacity = 0.5;
    }
}

// ==========================================
// 2D HUD 오버레이 & 지구 크기 비교식 연동
// ==========================================
function update2DHUD(radius, mass, orbit, temp, density) {
    document.getElementById("hudMass").innerText = " 지구 질량 "+ mass.toFixed(2) + " R⊕ ";
    document.getElementById("hudRadius").innerText = " 지구 반지름 " + radius.toFixed(2) + " R⊕ ";
    document.getElementById("hudOrbit").innerText = orbit.toFixed(2) + " AU";
    document.getElementById("hudTemp").innerText = temp.toFixed(0) + " K";

    // HUD 상단의 행성 이름 가공 바인딩 추가
    const validatedExoName = cleanCelestialName(currentPlanet.pl_name);
    document.getElementById("hudExoName").innerText = `${validatedExoName} (${radius.toFixed(1)} R⊕)`;

    const exoCircle = document.getElementById("hudExoCircle");
    if(exoCircle) {
        let targetPixelSize = 30 * radius;
        targetPixelSize = Math.max(10, Math.min(100, targetPixelSize));
        
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
// 예상 생명체 빌더
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