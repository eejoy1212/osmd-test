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
    🎵 **OSMD 시스템 시작**
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
        await osmd.load(fileData);
        window.osmd = osmd;
        console.log("✅ OSMD: 파일 로드 완료, 렌더링 시작...");
        await osmd.render();

        // ✅ 음표 클릭 이벤트 추가
        setTimeout(() => 
            addNoteClickEvent()
            
        , 500);
    } catch (error) {
        console.error("❌ OSMD 렌더링 실패:", error);
    }
}

/*
    🎵 **음표 클릭 이벤트 추가 (선택된 음표 ID 전달)**
*/
function addNoteClickEvent() {
    let svgContainer = document.querySelector("#osmdCanvas svg");

    if (!svgContainer) {
        console.error("🚨 SVG 컨테이너가 아직 렌더링되지 않았습니다. 다시 확인합니다.");
        setTimeout(addNoteClickEvent, 300);
        return;
    }

    svgContainer.addEventListener("click", function (event) {
        let target = event.target.closest("g.vf-stavenote");
        if (target) {
            let noteId = target.getAttribute("id");
            console.log("🎯 선택된 음표 ID:", noteId);

            if (window.flutter_inappwebview) {
                window.flutter_inappwebview.callHandler("selectNote", noteId);
            }
        }
    });
}

/*
    🎵 **선택된 음표를 건반에서 입력한 음표로 변경**
*/
async function changeSelectedNote(newStep, newOctave) {
    console.log(`🎵 in changeSelectedNote: ${newStep}${newOctave}`);
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

    let selectedNote = notes[0];  // 🔹 지금은 첫 번째 음표를 바꿈 (선택 기능은 나중에 개선)

    let stepElement = selectedNote.getElementsByTagName("step")[0];
    let octaveElement = selectedNote.getElementsByTagName("octave")[0];

    if (stepElement && octaveElement) {
        stepElement.textContent = newStep
        octaveElement.textContent = newOctave;
        // stepElement.textContent = "G"//newStep;
        // octaveElement.textContent ="4"// newOctave;
        console.log(`🎵 변경 완료: ${stepElement.textContent}${octaveElement.textContent}`);
    }

    let serializer = new XMLSerializer();
    let modifiedXmlData = serializer.serializeToString(xmlDoc);

    await osmd.load(modifiedXmlData);

    // ✅ 음표 색상 변경 (빨간색 강조)
    osmd.graphic.measureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor = "#FF0000";

    await osmd.render();
    console.log("🎵 변경된 음표가 적용되었습니다.");
}
