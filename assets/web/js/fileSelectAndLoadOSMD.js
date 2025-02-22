// ✅ 원본 MusicXML 데이터를 저장할 변수
let originalFileData = ""; 

window.addEventListener("flutterInAppWebViewPlatformReady", async function (_) {
    try {
        const inputJson = await window.flutter_inappwebview.callHandler("sendFileToOSMD");
        if (!inputJson || !inputJson.bytes) {
            console.error("❌ OSMD: 전달된 파일 데이터가 없습니다.");
            return;
        }

        originalFileData = inputJson.bytes; // ✅ 원본 파일 데이터 저장
        console.log("📌 OSMD: 파일 데이터 로드 시작");
        await startOSMD(originalFileData); // ✅ OSMD 실행
    } catch (error) {
        console.error("❌ OSMD 로딩 실패:", error);
    }
});

/*
    🎵 **MusicXML byte string을 읽어서 OSMD 시스템에 넘기는 함수**
*/
async function startOSMD(fileData) {
    try {
        var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmdCanvas", {
            autoResize: true,
            backend: "svg",
            drawTitle: true,
            followCursor: true,
            drawPartNames: true,
            drawMeasureNumbers: true,
            drawingParameters: "all",
            renderSingleHorizontalStaffline: false,
        });

        console.log("📌 OSMD: 파일 로딩 중...");
        await osmd.load(fileData, ""); // ✅ 악보 데이터 로드
        window.osmd = osmd;

        console.log("✅ OSMD: 파일 로드 완료, 렌더링 시작...");
        await osmd.render(); // ✅ OSMD가 완전히 렌더링될 때까지 기다림

        setTimeout(() => { 
            addNoteClickEvent(); // ✅ 렌더링이 완료된 후 이벤트 추가
        }, 500); // 500ms 대기 (렌더링 보장)
    } catch (error) {
        console.error("❌ OSMD 렌더링 실패:", error);
    }
}

/*
    🎵 **OSMD 음표 클릭 이벤트 추가 (음표 클릭 시 음 변경)**
*/
function addNoteClickEvent() {
    let svgContainer = document.querySelector("#osmdCanvas svg");

    if (!svgContainer) {
        console.error("🚨 SVG 컨테이너가 아직 렌더링되지 않았습니다. 다시 확인합니다.");
        setTimeout(addNoteClickEvent, 300); // 300ms 후 다시 시도
        return;
    }

    svgContainer.addEventListener("click", async function (event) {
        let target = event.target.closest("g.vf-stavenote"); // 🎯 클릭한 음표 찾기

        if (target) {
            console.log("✅ 음표 클릭 감지됨!", target);
            await changeNoteAndReload(); // ✅ 클릭 시 XML 수정 후 다시 로드
        }
    });
}

/*
    🎵 **클릭한 음표의 Pitch 변경 → XML 파일 수정 후 다시 로드**
*/
async function changeNoteAndReload() {
    if (!originalFileData) {
        console.error("❌ 원본 XML 데이터가 없습니다.");
        return;
    }

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");

    let notes = xmlDoc.getElementsByTagName("note");
    if (notes.length === 0) {
        console.error("❌ XML에서 음표를 찾을 수 없습니다.");
        return;
    }

    // ✅ 첫 번째 음표 변경 (예: C4 → G4)
    let firstNote = notes[0];  // 🔹 두 번째 음표를 변경 (0이면 첫 번째)

    let stepElement = firstNote.getElementsByTagName("step")[0];
    let octaveElement = firstNote.getElementsByTagName("octave")[0];

    if (stepElement && octaveElement) {
        stepElement.textContent = "G"; // ✅ C → G 변경
        octaveElement.textContent = "4"; // ✅ 옥타브 변경

        console.log("🎵 XML 변경 완료: C4 → G4");
    }

    // ✅ 수정된 XML을 다시 문자열로 변환
    let serializer = new XMLSerializer();
    let modifiedXmlData = serializer.serializeToString(xmlDoc);

    console.log("📌 수정된 XML 데이터:", modifiedXmlData);

    // ✅ 수정된 XML을 다시 로드
    await osmd.load(modifiedXmlData);
    osmd.graphic.measureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor = "#FF0000"; 
    await osmd.render();

    // ✅ 음표 색상 변경 (noteheadColor 직접 변경)
    setTimeout(() => {
       }, 500); // 🎵 렌더링 완료 후 실행 (약간의 딜레이 필요)
}

