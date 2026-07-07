// ==========================================================================
// 🌌 DEEP SPACE ARCHIVE ENGINE (archive.js - DETERMINISTIC FIXED COLOR VERSION)
// ==========================================================================

let activePlanetsData = {};
let scene, camera, renderer, controls, starMesh, planetMesh;
let planetAngle = 0, currentOrbitPx = 15;
let animationFrameId = null; 
let database = null;

document.addEventListener("DOMContentLoaded", initializeEngineWithFirebase);

// ==========================================================================
// 🎨 [핵심 고정 알고리즘] 행성의 고유 Key 기반으로 절대 변하지 않는 Hue(0~360) 생성
// ==========================================================================
function getPlanetDeterministicHue(key) {
    if (!key) return 140; // 예외 처리용 기본 초록색
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const finalHue = Math.abs(hash) % 360;
    return finalHue;
}

// ==========================================================================
// 🔗 0. Firebase 원격 저장소 설정 로드 및 초기화
// ==========================================================================
function initializeEngineWithFirebase() {
    const grid = document.getElementById("archiveGrid");
    if (grid) grid.innerHTML = `<p id="loadingText" style="grid-column: 1/-1; text-align:center; color:#aaa;">우주 아카이브 데이터베이스 연결 중...</p>`;

    const defaultBootstrapConfig = {
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
        firebase.initializeApp(defaultBootstrapConfig);
    }
    const bootstrapDb = firebase.database();

    bootstrapDb.ref('virtual_config').once('value').then((snapshot) => {
        const remoteConfig = snapshot.val();
        const finalConfig = remoteConfig ? remoteConfig : defaultBootstrapConfig;

        if (remoteConfig && firebase.apps.length) {
            firebase.app().delete().then(() => {
                firebase.initializeApp(finalConfig);
                database = firebase.database();
                fetchArchivePlanets();
            });
        } else {
            database = bootstrapDb;
            fetchArchivePlanets();
        }
    }).catch((error) => {
        console.error("Firebase 원격 구동 에러, 기본값으로 강제 전환:", error);
        database = bootstrapDb;
        fetchArchivePlanets();
    });
}

// ==========================================================================
// 📁 1. Firebase 실시간 동기화 및 렌더링 파트
// ==========================================================================
function fetchArchivePlanets() {
    const grid = document.getElementById("archiveGrid");
    const loading = document.getElementById("loadingText");
    const podium = document.getElementById("podiumContainer");

    database.ref('discovered_planets').on('value', (snapshot) => {
        if (loading) loading.remove();
        grid.innerHTML = "";
        podium.innerHTML = "";

        const data = snapshot.val();
        if (!data) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#aaa;">등록된 외계행성이 없습니다.</p>`;
            podium.innerHTML = `<p style="color: #aaa;">랭킹을 매길 행성이 아직 존재하지 않습니다.</p>`;
            return;
        }

        activePlanetsData = data;

        const sortedArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        })).sort((a, b) => b.score - a.score);

        let podiumList = [];
        if (sortedArray[0]) podiumList.push({ rank: 1, data: sortedArray[0], color: "#ffd700", crown: "🥇" });
        if (sortedArray[1]) podiumList.push({ rank: 2, data: sortedArray[1], color: "#d1d1d1", crown: "🥈" });
        if (sortedArray[2]) podiumList.push({ rank: 3, data: sortedArray[2], color: "#cd7f32", crown: "🥉" });

        podiumList.forEach(item => {
            const podBox = document.createElement("div");
            podBox.style.cssText = `
                width: 180px;
                height: 180px;
                background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
                border: 2px solid ${item.color};
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                cursor: pointer;
                box-shadow: 0 0 25px rgba(255,215,0,0.05);
                transition: transform 0.2s;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            `;
            podBox.onclick = () => openPlanetDetail(item.data.id);
            podBox.onmouseenter = () => podBox.style.transform = "scale(1.04)";
            podBox.onmouseleave = () => podBox.style.transform = "scale(1.0)";

            // 🥇 명예의 전당 행성 고유 색상 매핑
            const podiumHue = getPlanetDeterministicHue(item.data.id);
            let cBg = `radial-gradient(circle at 30% 30%, hsl(${podiumHue}, 85%, 70%), hsl(${podiumHue}, 90%, 40%))`;

            podBox.innerHTML = `
                <div style="font-size: 1.4rem; margin-bottom: 3px;">${item.crown} <span style="font-size:0.9rem; font-weight:bold; color:${item.color}">${item.rank}등</span></div>
                <div style="width: 40px; height: 40px; background: ${cBg}; border-radius: 50%; margin: 5px 0 8px 0; box-shadow: 0 0 10px ${item.color};"></div>
                <strong style="font-size: 0.95rem; color: #fff; display: block; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.data.customName}</strong>
                <span style="font-size: 1.1rem; font-weight: 900; color: ${item.color}; margin-top: 3px;">${item.data.score}%</span>
            `;
            podium.appendChild(podBox);
        });

        // 📁 전체 행성 하단 카드 목록
        Object.keys(data).forEach((key) => {
            const planet = data[key];
            
            // 🎨 고유 해시 색상 추출 및 배경 생성
            const targetHue = getPlanetDeterministicHue(key);
            const ballBg = `radial-gradient(circle at 30% 30%, hsl(${targetHue}, 85%, 70%), hsl(${targetHue}, 90%, 40%))`;

            const card = document.createElement("div");
            card.style.cssText = `
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 20px;
                text-align: center;
                cursor: pointer;
                transition: transform 0.2s, border-color 0.2s;
            `;
            card.onclick = () => openPlanetDetail(key);
            card.onmouseenter = () => { card.style.transform = "translateY(-5px)"; card.style.borderColor = "#2ecc71"; };
            card.onmouseleave = () => { card.style.transform = "translateY(0)"; card.style.borderColor = "rgba(255,255,255,0.1)"; };

            card.innerHTML = `
                <div style="width: 60px; height: 60px; background: ${ballBg}; border-radius: 50%; margin: 0 auto 12px; box-shadow: 0 0 15px rgba(255,255,255,0.1);"></div>
                <h3 style="margin: 0 0 4px 0; color: #fff; font-size: 1.1rem; font-weight: bold;">${planet.customName}</h3>
                <span style="font-size: 0.8rem; color: #6ab8ff; display: block; margin-bottom: 8px;">코드명: ${planet.starName}</span>
                <div style="background: rgba(46,204,113,0.15); color: #2ecc71; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; display: inline-block;">
                    거주율 ${planet.score}%
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

// ==========================================================================
// 🔍 2. 오차율 연산 및 모달창 출력 데이터 맵핑
// ==========================================================================
function getDiffText(currentVal, earthVal) {
    let diff = currentVal - earthVal; 
    if (diff === 0) return `<span style="color:#aaa; font-size:0.8rem; font-weight:normal; margin-left:6px;">(지구와 동일)</span>`;
    
    let sign = diff > 0 ? "+" : "";
    let color = diff > 0 ? "#ff4d4d" : "#3399ff";
    return `<span style="color:${color}; font-size:0.8rem; font-weight:normal; margin-left:6px;">(${sign}${diff.toFixed(2)}%)</span>`;
}

function openPlanetDetail(key) {
    const p = activePlanetsData[key];
    if(!p) return;
    
    document.getElementById("detailModal").style.display = "flex";

    document.getElementById("modalCustomName").innerText = p.customName;
    document.getElementById("modalStarInfo").innerText = `System: 부모항성 명칭 [${p.starName}] / 분광성상 [${p.starSpec || 'G'}형 주계열성]`;
    document.getElementById("modalHabitabilityLevel").innerText = `종합 거주 가능성 판정: ${p.level}`;
    document.getElementById("modalHabitabilityScore").innerText = `${p.score}%`;

    document.getElementById("mRad").innerHTML = `${p.planetRadius.toFixed(2)} R_Earth ${getDiffText(p.planetRadius, 1.0)}`;
    document.getElementById("mMass").innerHTML = `${p.planetMass.toFixed(2)} M_Earth ${getDiffText(p.planetMass, 1.0)}`;
    document.getElementById("mOrbit").innerHTML = `${p.orbitRadius.toFixed(2)} AU ${getDiffText(p.orbitRadius, 1.0)}`;
    document.getElementById("mDens").innerHTML = `${p.density.toFixed(2)} ρ_Earth ${getDiffText(p.density, 1.0)}`;
    document.getElementById("mInsol").innerHTML = `${p.insolation.toFixed(2)} S_Earth ${getDiffText(p.insolation, 1.0)}`;
    document.getElementById("mTemp").innerHTML = `${p.equilibriumTemp} K ${getDiffText(p.equilibriumTemp, 288)}`;

    const alienBox = document.getElementById("modalAlienBox");
    const alienImg = document.getElementById("modalAlienImg");

    if ((p.hasAlien === true || p.hasAlien === "true") && p.alienNumber) {
        alienImg.src = `외계인폴더/외계인${p.alienNumber}.png`; 
        alienBox.style.display = "block";
    } else {
        alienImg.src = "";
        alienBox.style.display = "none";
    }

    const circle2D = document.getElementById("modal2DCircle");
    let pxSize = Math.max(10, Math.min(75, 30 * p.planetRadius));
    circle2D.style.width = pxSize + "px";
    circle2D.style.height = pxSize + "px";
    
    // 🎨 모달창 내 2D 스케일 원 색상도 고유 해시 색상으로 고정
    const modalHue = getPlanetDeterministicHue(key);
    circle2D.style.background = `radial-gradient(circle at 30% 30%, hsl(${modalHue}, 85%, 70%), hsl(${modalHue}, 90%, 40%))`;

    initModalThreeJS(key, p);
}

// ==========================================================================
// 🚀 3. 부드러운 애니메이션 Three.js 궤도 시뮬레이터 엔진 파트
// ==========================================================================
function initModalThreeJS(key, p) {
    const container = document.getElementById("modalCanvasContainer");
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) renderer.dispose();
    container.innerHTML = "";

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 18, 22); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0x666666));
    const pLight = new THREE.PointLight(0xffffff, 2.5, 200);
    scene.add(pLight);

    let starColor = 0xffaa00;
    if (p.starTemp >= 7500) starColor = 0xa5c9ff;
    else if (p.starTemp >= 6000) starColor = 0xffffff;
    else if (p.starTemp < 3700) starColor = 0xff3300;

    let sRadiusPx = Math.max(1.5, Math.min(4.0, (p.starRadius || 1.0) * 1.8));
    starMesh = new THREE.Mesh(new THREE.SphereGeometry(sRadiusPx, 32, 32), new THREE.MeshBasicMaterial({ color: starColor }));
    scene.add(starMesh);

    currentOrbitPx = Math.max(sRadiusPx + 4, Math.min(32, p.orbitRadius * 8));
    const points = [];
    for (let i = 0; i <= 64; i++) {
        let th = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(th) * currentOrbitPx, 0, Math.sin(th) * currentOrbitPx));
    }
    const orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }));
    scene.add(orbitLine);

    // 🎨 Three.js 3D 행성 표면 색상도 고유 해시 HSL로 매핑 고정
    const modalPlanetHue = getPlanetDeterministicHue(key);
    const threeJsPlanetColor = new THREE.Color(`hsl(${modalPlanetHue}, 90%, 50%)`);

    let pRadiusPx = Math.max(0.5, Math.min(1.8, p.planetRadius * 0.35));
    planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(pRadiusPx, 32, 32), 
        new THREE.MeshStandardMaterial({ color: threeJsPlanetColor, roughness: 0.3 })
    );
    planetMesh.position.x = currentOrbitPx;
    scene.add(planetMesh);

    function animateModal() {
        animationFrameId = requestAnimationFrame(animateModal);
        if (controls) controls.update();
        
        if (planetMesh) {
            planetAngle += 0.012; 
            planetMesh.position.x = Math.cos(planetAngle) * currentOrbitPx;
            planetMesh.position.z = Math.sin(planetAngle) * currentOrbitPx;
            planetMesh.rotation.y += 0.02;
        }
        
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    animateModal(); 
}

function closeModal() {
    document.getElementById("detailModal").style.display = "none";
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    scene = null;
    camera = null;
    controls = null;
}