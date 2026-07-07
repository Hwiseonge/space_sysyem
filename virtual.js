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
    // 외계인 레이어도 초기화 시점에 숨김
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

    log.innerHTML += `<h3>STEP 1. 식현상(Transit) 분석</h3>`;
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
//// ==========================================================================
    // 👽 외계인 등장을 위한 핵심 제어 파트 (우하단 고정 강제 주입 추가)
    // ==========================================================================
    let hasAlien = score >= 60;
    let chosenAlienNum = 0;

    if (hasAlien) {
        // 외계인 1부터 7까지 무작위 선택
        chosenAlienNum = Math.floor(Math.random() * 7) + 1;
        const alienDancerBox = document.getElementById("live-alien-dancer");
        const alienImgTag = document.getElementById("live-alien-img");
        
        // 🌟 HTML의 기존 style을 무시하고 오른쪽 아래에 박아버림
        alienDancerBox.style.position = "fixed";   // 화면 전체 기준 고정
        alienDancerBox.style.bottom = "00px";       // 바닥에서 25px 띄움
        alienDancerBox.style.right = "25px";        // 우측에서 25px 띄움
        alienDancerBox.style.top = "auto";          // 혹시 상단 고정이 걸려있을 수 있으니 초기화
        alienDancerBox.style.left = "auto";         // 혹시 좌측 고정이 걸려있을 수 있으니 초기화
        alienDancerBox.style.zIndex = "9999";       // 3D 화면을 가리지 않도록 맨 위 레이어로 설정

        // 이미지 경로를 '외계인폴더/외계인1.png' 형식으로 연결
        alienImgTag.src = `외계인폴더/외계인${chosenAlienNum}.png`;
        alienDancerBox.style.display = "block"; // 화면에 둠칫둠칫 등장시키기
    }
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
        hasAlien: hasAlien,            // 💾 유무 정보 저장[cite: 3]
        alienNumber: chosenAlienNum,   // 💾 무작위 결정된 번호 저장 (모음집 연동용)[cite: 3]
        timestamp: new Date().toISOString()
    };

    activateSection('sec-habitability');
    await sleep(3000);

    if (typeof updateThreeJSScene === "function") {
        updateThreeJSScene(radius, density, temp, score, generatedPlanetData.st_rad, generatedPlanetData.starLum, orbit, generatedPlanetData.st_teff);
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
    
    await sleep(2500);
    activateSection('sec-save');
}

function update2DHUD(radius, mass, orbit, temp, density) {
    document.getElementById("hudMass").innerText = mass.toFixed(2) + " M_Earth";
    document.getElementById("hudRadius").innerText = radius.toFixed(2) + " R_Earth";
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