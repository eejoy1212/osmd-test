let originalFileData = "";
let selectedNoteIndex = null; // ✅ 선택된 음표 인덱스 저장

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
            followCursor: true,  // ✅ 커서 따라가도록 설정
            drawPartNames: true,
            drawMeasureNumbers: true,
            drawingParameters: "all",
            renderSingleHorizontalStaffline: false,
        });

        console.log("📌 OSMD: 파일 로딩 중...");
        // await osmd.load(fileData);
        window.osmd = osmd;

        console.log("✅ OSMD: 파일 로드 완료, 렌더링 시작...");
        await osmd.render();

        setTimeout(() => {
            osmd.cursor.show();  // ✅ 커서 표시
            osmd.cursor.reset(); // ✅ 초기 위치로 리셋
        }, 500); // 렌더링 후 커서 설정 (약간의 딜레이)

        setTimeout(() => addNoteClickEvent(), 500); // 클릭 이벤트 추가
    } catch (error) {
        console.error("❌ OSMD 렌더링 실패:", error);
    }
}


/*
    🎵 **음표 클릭 이벤트 추가 (선택된 음표 저장)**
*/
/*
    🎵 **음표 클릭 이벤트 추가 (터치 영역 네모 추가)**
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
            let noteId = target.getAttribute("id")?.trim();
            console.log("🎯 선택된 음표 ID in js:", noteId);

            let found = false;
            let selectedBBox = null; // 선택된 음표의 bounding box 저장
            let selectedNoteElement = null;

            for (let measureIndex = 0; measureIndex < osmd.graphic.measureList.length; measureIndex++) {
                for (let staffIndex = 0; staffIndex < osmd.graphic.measureList[measureIndex].length; staffIndex++) {
                    let measure = osmd.graphic.measureList[measureIndex][staffIndex];

                    for (let staffEntry of measure.staffEntries) {
                        for (let voiceEntry of staffEntry.graphicalVoiceEntries) {
                            for (let i = 0; i < voiceEntry.notes.length; i++) {
                                let note = voiceEntry.notes[i];

                                if (!note.vfnote) continue; // ✅ vfnote가 없으면 건너뛰기

                                let vfArray = Array.isArray(note.vfnote) ? note.vfnote : [note.vfnote]; // ✅ vfnote가 배열인지 확인

                                for (let j = 0; j < vfArray.length; j++) {
                                    let vf = vfArray[j];
                                    let vfId = `vf-${vf?.attrs?.id}`.trim(); // ✅ ID 문자열 생성 후 trim()

                                    console.log("🔎 비교:", vfId, "vs", noteId);

                                    if (vfId === noteId) {
                                        console.log(`📌 선택된 음표 찾음! Measure ${measureIndex}, Staff ${staffIndex}, Note ${i}`);
                                        
                                        selectedNoteIndex = { measureIndex, staffIndex, staffEntry, voiceEntry, noteIndex: i };
                                        selectedBBox = vf.attrs.el.getBBox(); // ✅ 선택된 음표의 bounding box 가져오기
                                        selectedNoteElement = vf.attrs.el;
                                        found = true;
                                        break; // ✅ 일치하는 음표를 찾으면 더 이상 검사하지 않고 중단
                                    }
                                }
                                if (found) break;
                            }
                            if (found) break;
                        }
                        if (found) break;
                    }
                    if (found) break;
                }
                if (found) break;
            }

            if (!found) {
                console.warn("❌ 선택한 음표를 찾을 수 없습니다.");
            } else {
                console.log("✅ 선택된 음표 정보:", selectedNoteIndex);
                // highlightSelectedNote(selectedNoteElement, selectedBBox);
            }

            if (window.flutter_inappwebview) {
                console.log("📡 Flutter로 선택된 음표 ID 전송:", noteId);
                window.flutter_inappwebview.callHandler("selectNote", noteId);
            }
        }
    });
}

/*
    🎵 **선택된 음표를 강조하는 네모 추가**
*/
function highlightSelectedNote(noteElement, bbox) {
    let svg = document.querySelector("#osmdCanvas svg");

    if (!svg) {
        console.error("❌ SVG 컨테이너를 찾을 수 없습니다.");
        return;
    }

    // 기존 네모 제거
    let existingRect = document.querySelector("#highlightRect");
    if (existingRect) {
        existingRect.remove();
    }

    // 새 네모 추가
    let highlightRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    highlightRect.setAttribute("id", "highlightRect");
    highlightRect.setAttribute("x", bbox.x - 2);
    highlightRect.setAttribute("y", bbox.y - 2);
    highlightRect.setAttribute("width", bbox.width + 4);
    highlightRect.setAttribute("height", bbox.height + 4);
    highlightRect.setAttribute("stroke", "blue"); // 파란색 테두리
    highlightRect.setAttribute("stroke-width", "2");
    highlightRect.setAttribute("fill", "none");

    svg.appendChild(highlightRect);
    console.log("✅ 파란색 네모 추가 완료!");
}


/*
    🎵 **선택된 음표를 건반에서 입력한 음표로 변경**
*/
async function changeSelectedNote(newStep, newOctave) {
    console.log(`🎵 건반 입력받음: ${newStep}${newOctave}`);
    if (!originalFileData) {
        console.error("❌ 원본 XML 데이터가 없습니다.");
        return;
    }

    if (!selectedNoteIndex) {
        console.error("❌ 선택된 음표가 없습니다.");
        return;
    }

    let { measureIndex, staffIndex, noteIndex } = selectedNoteIndex;

    // ✅ XML 파싱
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    console.log("📌 xmlDoc",xmlDoc);
    let notes = xmlDoc.getElementsByTagName("note");
    console.log("📌 notes",notes);
    if (notes.length === 0) {
        console.error("❌ XML에서 음표를 찾을 수 없습니다.");
        return;
    }
    console.log("📌 noteIndex",noteIndex);
    // let selectedNote = notes[noteIndex];
    let selectedNote = notes[0];
    console.log("📌 selectedNote",selectedNote);
    let stepElement = selectedNote.getElementsByTagName("step")[0];
    let octaveElement = selectedNote.getElementsByTagName("octave")[0];

    if (stepElement && octaveElement) {
        stepElement.textContent = newStep;
        octaveElement.textContent = newOctave;
        console.log(`🎵 변경 완료: ${stepElement.textContent}${octaveElement.textContent}`);
    }

    let serializer = new XMLSerializer();
    let modifiedXmlData = serializer.serializeToString(xmlDoc);

    await osmd.load(modifiedXmlData);

    // ✅ 음표 색상 변경 (빨간색 강조)
    osmd.graphic.measureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor = "#FC0AF0FF";

    await osmd.render();
    console.log("🎵 변경된 음표가 적용되었습니다.");
}
// ✅ 커서 이동 테스트
// ✅ 커서 이동 방향에 따라 이동하는 코드로 개선
function moveCursor(direction) {
    console.log("커서 이동 요청 방향:", direction);
    const cursor = osmd.cursor;
    cursor.show();

    if (direction === 'right') {
        cursor.next(); // 오른쪽 방향키 (다음 음표로)
    } else if (direction === 'left') {
        cursor.previous(); // 왼쪽 방향키 (이전 음표로)
    }

    const cursorVoiceEntry = cursor.Iterator.CurrentVoiceEntries[0];
    if (cursorVoiceEntry) {
        const lowestVoiceEntryNote = cursorVoiceEntry.Notes[0];
        console.log("🎹 Stem direction:", cursorVoiceEntry.StemDirection);
        console.log("🎵 Base note at cursor:", lowestVoiceEntryNote.Pitch.ToString());
    } else {
        console.log("⚠️ 더 이상 음표가 없습니다.");
    }
}
//1. 음표 추가-기본음표
// async function insertNoteAtCursor(step, octave) {
//     if (!originalFileData) return;

//     // ✅ 현재 커서 위치 저장
//     let measureIndex = osmd.cursor.iterator.currentMeasureIndex;
//     let cursorNoteIndex = osmd.cursor.iterator.currentVoiceEntryIndex;

//     // ✅ XML에서 해당 마디의 음표 가져오기
//     let parser = new DOMParser();
//     let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
//     let measureXml = xmlDoc.getElementsByTagName("measure")[measureIndex];
//     let notesInMeasure = measureXml.getElementsByTagName("note");

//     // 🎯 새 음표 생성
//     let newNote = xmlDoc.createElement("note");

//     let pitch = xmlDoc.createElement("pitch");
//     let stepEl = xmlDoc.createElement("step");
//     stepEl.textContent = step;
//     pitch.appendChild(stepEl);

//     let octaveEl = xmlDoc.createElement("octave");
//     octaveEl.textContent = octave;
//     pitch.appendChild(octaveEl);

//     let duration = xmlDoc.createElement("duration");
//     duration.textContent = "1";

//     let type = xmlDoc.createElement("type");
//     type.textContent = "quarter";

//     newNote.appendChild(pitch);
//     newNote.appendChild(duration);
//     newNote.appendChild(type);

//     let parentMeasure = notesInMeasure[0].parentNode;

//     // ✅ 오른쪽에 음표 삽입 (현재 음표 다음)
//     if (cursorNoteIndex >= notesInMeasure.length - 1) {
//         parentMeasure.appendChild(newNote);
//     } else {
//         parentMeasure.insertBefore(newNote, notesInMeasure[cursorNoteIndex + 1]);
//     }

//     let serializer = new XMLSerializer();
//     originalFileData = serializer.serializeToString(xmlDoc);

//     // ✅ 변경된 XML 다시 로드 후 렌더링
//     await osmd.load(originalFileData);
//     await osmd.render();

//     // ✅ 렌더링 완료 후 딜레이 후 색상 적용 및 커서 복구
//     setTimeout(() => {
//         try {
//             const insertedNoteIndex = cursorNoteIndex + 1;

//             // ✅ 정확히 추가된 음표를 찾아서 초록색으로 변경
//             const insertedNote = osmd.graphic.measureList[measureIndex][0]
//                 .staffEntries[insertedNoteIndex]
//                 .graphicalVoiceEntries[0]
//                 .notes[0].sourceNote;

//             insertedNote.noteheadColor = "#00FF00"; // 초록색 설정
//             osmd.render(); // 다시 렌더링하여 색상 반영

//             // ✅ 커서를 원래 위치로 복구
//             osmd.cursor.reset();
//             for (let i = 0; i < measureIndex; i++) {
//                 osmd.cursor.next();
//             }
//             for (let i = 0; i < cursorNoteIndex; i++) {
//                 osmd.cursor.next();
//             }
//             osmd.cursor.show();

//         } catch (err) {
//             console.error("음표 색상 변경 오류:", err);
//         }
//     }, 500); // 렌더링 안정화를 위한 충분한 딜레이 (500ms)
// }
// ✅ 음표 추가 : 온음표~64분음표
// 2. 음표 추가-인자로 받아서 유동적으로(온음표~64분음표)
// async function insertNoteAtCursor(step, octave, noteType = "whole", duration = 4) {
//     if (!originalFileData) return;

//     // ✅ 현재 커서 위치 저장
//     let measureIndex = osmd.cursor.iterator.currentMeasureIndex;
//     let cursorNoteIndex = osmd.cursor.iterator.currentVoiceEntryIndex;

//     // ✅ XML에서 해당 마디의 음표 가져오기
//     let parser = new DOMParser();
//     let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
//     let measureXml = xmlDoc.getElementsByTagName("measure")[measureIndex];
//     let notesInMeasure = measureXml.getElementsByTagName("note");

//     // 🎯 새 음표 생성 (음표 종류 및 지속 시간 적용)
//     let newNote = xmlDoc.createElement("note");

//     let pitch = xmlDoc.createElement("pitch");
//     let stepEl = xmlDoc.createElement("step");
//     stepEl.textContent = step;
//     pitch.appendChild(stepEl);

//     let octaveEl = xmlDoc.createElement("octave");
//     octaveEl.textContent = octave;
//     pitch.appendChild(octaveEl);

//     let durationEl = xmlDoc.createElement("duration");
//     durationEl.textContent = duration;  // ✅ 인자로 받은 지속 시간 적용

//     let type = xmlDoc.createElement("type");
//     type.textContent = noteType; // ✅ 인자로 받은 음표 타입 적용

//     newNote.appendChild(pitch);
//     newNote.appendChild(durationEl);
//     newNote.appendChild(type);

//     let parentMeasure = notesInMeasure[0].parentNode;

//     // ✅ 현재 음표 다음에 삽입 (커서 기준 오른쪽에 추가)
//     if (cursorNoteIndex >= notesInMeasure.length - 1) {
//         parentMeasure.appendChild(newNote);
//     } else {
//         parentMeasure.insertBefore(newNote, notesInMeasure[cursorNoteIndex + 1]);
//     }

//     let serializer = new XMLSerializer();
//     originalFileData = serializer.serializeToString(xmlDoc);

//     // ✅ 변경된 XML 다시 로드 후 렌더링
//     await osmd.load(originalFileData);
//     await osmd.render();

//     // ✅ 렌더링 완료 후 음표 강조 및 커서 원위치 복구
//     setTimeout(() => {
//         try {
//             // const insertedNoteIndex = cursorNoteIndex + 1;

//             // // ✅ 추가된 음표를 초록색으로 강조
//             // const insertedNote = osmd.graphic.measureList[measureIndex][0]
//             //     .staffEntries[insertedNoteIndex]
//             //     .graphicalVoiceEntries[0]
//             //     .notes[0].sourceNote;

//             // insertedNote.noteheadColor = "#00FF00"; // ✅ 초록색으로 강조
//             osmd.render(); // ✅ 다시 렌더링하여 반영

//             // ✅ 커서를 원래 위치로 복구
//             osmd.cursor.reset();
//             for (let i = 0; i < measureIndex; i++) {
//                 osmd.cursor.next();
//             }
//             for (let i = 0; i < cursorNoteIndex; i++) {
//                 osmd.cursor.next();
//             }
//             osmd.cursor.show();

//         } catch (err) {
//             console.error("🎵 음표 색상 변경 오류:", err);
//         }
//     }, 500); // ✅ 렌더링 안정화를 위한 딜레이
// }
// ✅ 음표 추가 : 점추가 1개~더블 플랫
// 3.. 음표 추가-인자로 받아서 유동적으로(점추가 1개~더블 플랫)
async function insertNoteAtCursor(step, octave, noteType = "whole", duration = 4, accidental = null) {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = step;
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = octave;
    pitch.appendChild(octaveEl);

    // ✅ 기호(조표) 추가 (샵, 플랫 등)
    if (accidental !== null && accidental !== "dot") {
        let alterEl = xmlDoc.createElement("alter");
        alterEl.textContent = accidental;
        pitch.appendChild(alterEl);
    }

    let durationEl = xmlDoc.createElement("duration");

    // ✅ 점음표가 있는 경우 duration 값을 1.5배로 변경
    let finalDuration = accidental === "dot" ? Math.round(duration * 1.5) : duration;
    durationEl.textContent = finalDuration;

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = noteType;

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 점음표 추가 (dot 태그 추가)
    if (accidental === "dot") {
        let dotEl = xmlDoc.createElement("dot");
        newNote.appendChild(dotEl);
        console.log("🎵 점음표 추가됨 (duration 1.5배 적용)");
    }

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log(`🎵 추가된 음표: ${step}${octave}, 타입: ${noteType}, duration: ${finalDuration}, accidental: ${accidental}`);
}
// 4. 음표 추가-인자로 받아서 유동적으로(스타카토~페르마타)
async function insertNoteWithArticulation(step = "C", octave = 4, articulationType = "") {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = step;
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = octave;
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = 2; // ✅ 항상 2분음표 (duration = 2)

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // ✅ 항상 2분음표

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 아티큘레이션 추가 (스타카토, 테누토 등)
    if (articulationType !== "") {
        let notationsEl = xmlDoc.createElement("notations");
        let articulationsEl = xmlDoc.createElement("articulations");
        let articulationEl = xmlDoc.createElement(articulationType);

        articulationsEl.appendChild(articulationEl);
        notationsEl.appendChild(articulationsEl);
        newNote.appendChild(notationsEl);

        console.log(`🎵 ${articulationType} 기호 추가됨`);
    }

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log(`🎵 추가된 음표: ${step}${octave}, 타입: 2분음표 (half), 기호: ${articulationType}`);
}
//마르카토, 악센트, 카에수라, 아치아카투라, 꾸밈음
async function insertNoteWithNewArticulation(step = "C", octave = 4, articulationType = "") {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = step;
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = octave;
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = 2; // ✅ 항상 2분음표 (duration = 2)

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // ✅ 항상 2분음표

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ <notations> 태그 추가
    let notationsEl = xmlDoc.createElement("notations");
    let articulationsEl = xmlDoc.createElement("articulations");

    if (articulationType !== "") {
        if (["marcato", "accent"].includes(articulationType)) {
            let articulationEl = xmlDoc.createElement(articulationType);
            articulationsEl.appendChild(articulationEl);
            console.log(`🎵 ${articulationType} 기호 추가됨`);
        } 
        else if (articulationType === "caesura") {
            let breathMark = xmlDoc.createElement("breath-mark");
            breathMark.setAttribute("type", "caesura");
            notationsEl.appendChild(breathMark);
            console.log("🎵 카에수라 추가됨");
        } 
        else if (articulationType === "appoggiatura" || articulationType === "grace-note") {
            let graceEl = xmlDoc.createElement("grace");
            newNote.appendChild(graceEl);
            console.log(`🎵 ${articulationType} (꾸밈음) 추가됨`);
        }
    }

    if (articulationsEl.children.length > 0) {
        notationsEl.appendChild(articulationsEl);
    }

    if (notationsEl.children.length > 0) {
        newNote.appendChild(notationsEl);
    }

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log(`🎵 추가된 음표: ${step}${octave}, 타입: 2분음표 (half), 기호: ${articulationType}`);
}

// ✅ 점음표(점 1개) 추가
async function addDottedQuarterNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // ✅ 음 C로 고정
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // ✅ 옥타브 4로 고정
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = Math.round(1 * 1.5); // ✅ 4분음표(1) * 1.5 = 점 4분음표의 duration

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "quarter"; // ✅ 4분음표 타입

    let dotEl = xmlDoc.createElement("dot"); // ✅ 점음표 추가

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);
    newNote.appendChild(dotEl); // ✅ 점음표 추가

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 점 4분음표(C4) 추가됨!");
}
// ✅ 점음표(점 2개) 추가
async function addDoubleDottedQuarterNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // ✅ 음 C로 고정
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // ✅ 옥타브 4로 고정
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = Math.round(1 * 1.75); // ✅ 4분음표(1) * 1.75 = 점 두 개 있는 4분음표의 duration

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "quarter"; // ✅ 4분음표 타입

    let dotEl1 = xmlDoc.createElement("dot"); // ✅ 첫 번째 점 추가
    let dotEl2 = xmlDoc.createElement("dot"); // ✅ 두 번째 점 추가

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);
    newNote.appendChild(dotEl1); // ✅ 첫 번째 점음표 추가
    newNote.appendChild(dotEl2); // ✅ 두 번째 점음표 추가

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 점 두 개 있는 4분음표(C4) 추가됨!");
}
//✅ 데드 노트 추가
async function insertDeadNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // 기본 음은 C
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // 기본 옥타브는 4
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = 2; // 2분음표로 설정

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // 2분음표 타입

    let noteheadEl = xmlDoc.createElement("notehead");
    noteheadEl.textContent = "x"; // X 모양의 음표 머리

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);
    newNote.appendChild(noteheadEl); // ✅ 데드 노트 표현을 위한 X 모양 추가

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 x모양인 데드 노트(Dead Note) 추가됨!");
}
// ✅ 아르페지오 추가
async function insertArpeggioNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    // 🎵 코드(화음)로 만들기 위해 여러 개의 음표 추가
    let parentMeasure = notesInMeasure[0].parentNode;

    let chordNotes = [
        { step: "C", octave: 4 },
        { step: "E", octave: 4 },
        { step: "G", octave: 4 }
    ];

    chordNotes.forEach(noteData => {
        let newNote = xmlDoc.createElement("note");

        let pitch = xmlDoc.createElement("pitch");
        let stepEl = xmlDoc.createElement("step");
        stepEl.textContent = noteData.step;
        pitch.appendChild(stepEl);

        let octaveEl = xmlDoc.createElement("octave");
        octaveEl.textContent = noteData.octave;
        pitch.appendChild(octaveEl);

        let durationEl = xmlDoc.createElement("duration");
        durationEl.textContent = 2; // ✅ 2분음표

        let typeEl = xmlDoc.createElement("type");
        typeEl.textContent = "half";

        let chordEl = xmlDoc.createElement("chord"); // ✅ 화음(Chord) 요소 추가

        let notationsEl = xmlDoc.createElement("notations");
        let arpeggioEl = xmlDoc.createElement("arpeggiate"); // ✅ 아르페지오 추가

        notationsEl.appendChild(arpeggioEl);
        newNote.appendChild(chordEl);
        newNote.appendChild(pitch);
        newNote.appendChild(durationEl);
        newNote.appendChild(typeEl);
        newNote.appendChild(notationsEl); // ✅ 아르페지오 적용

        parentMeasure.appendChild(newNote);
    });

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 아르페지오(Arpeggio) 추가 완료!");
}
// ✅ 글리산도 추가
async function addTwoNotesWithGlissando() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    // ✅ 첫 번째 음표 (C4) 추가
    let firstNote = xmlDoc.createElement("note");

    let pitch1 = xmlDoc.createElement("pitch");
    let stepEl1 = xmlDoc.createElement("step");
    stepEl1.textContent = "C";
    pitch1.appendChild(stepEl1);

    let octaveEl1 = xmlDoc.createElement("octave");
    octaveEl1.textContent = "4";
    pitch1.appendChild(octaveEl1);

    let durationEl1 = xmlDoc.createElement("duration");
    durationEl1.textContent = "2"; // 2분음표

    let typeEl1 = xmlDoc.createElement("type");
    typeEl1.textContent = "half";

    firstNote.appendChild(pitch1);
    firstNote.appendChild(durationEl1);
    firstNote.appendChild(typeEl1);

    // ✅ 두 번째 음표 (G4) 추가
    let secondNote = xmlDoc.createElement("note");

    let pitch2 = xmlDoc.createElement("pitch");
    let stepEl2 = xmlDoc.createElement("step");
    stepEl2.textContent = "G";
    pitch2.appendChild(stepEl2);

    let octaveEl2 = xmlDoc.createElement("octave");
    octaveEl2.textContent = "4";
    pitch2.appendChild(octaveEl2);

    let durationEl2 = xmlDoc.createElement("duration");
    durationEl2.textContent = "2"; // 2분음표

    let typeEl2 = xmlDoc.createElement("type");
    typeEl2.textContent = "half";

    secondNote.appendChild(pitch2);
    secondNote.appendChild(durationEl2);
    secondNote.appendChild(typeEl2);

    // ✅ 글리산도 태그 추가
    let notationsEl = xmlDoc.createElement("notations");
    let glissandoEl = xmlDoc.createElement("glissando");
    glissandoEl.setAttribute("type", "start");

    notationsEl.appendChild(glissandoEl);
    firstNote.appendChild(notationsEl);

    let notationsEl2 = xmlDoc.createElement("notations");
    let glissandoEndEl = xmlDoc.createElement("glissando");
    glissandoEndEl.setAttribute("type", "stop");

    notationsEl2.appendChild(glissandoEndEl);
    secondNote.appendChild(notationsEl2);

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(firstNote);
    parentMeasure.appendChild(secondNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    // ✅ 글리산도 SVG를 정확한 위치에 삽입
    setTimeout(async () => {
        insertGlissandoSVG();
    }, 500);

    console.log("🎵 두 개의 음표 추가 + 글리산도 연결 완료!");
}




//글리산도 추가
// async function insertGlissandoSVG(startNote, endNote) {
//     setTimeout(async () => {
//         let svgContainer = document.querySelector("#osmdCanvas svg");

//         if (!svgContainer || !startNote || !endNote) {
//             console.error("🚨 SVG 컨테이너 또는 음표 위치를 찾을 수 없습니다.");
//             return;
//         }

//         let startBBox = startNote.getBoundingClientRect();
//         let endBBox = endNote.getBoundingClientRect();

//         let xStart = startBBox.left + window.scrollX;
//         let xEnd = endBBox.left + window.scrollX;
//         let yStart = startBBox.top + window.scrollY;
//         let yEnd = endBBox.top + window.scrollY;

//         // ✅ Flutter에서 Base64 인코딩된 이미지 데이터 가져오기
//         let base64Image = await window.flutter_inappwebview.callHandler("getLocalGlissandoImagePath");

//         if (!base64Image.startsWith("data:image/svg+xml;base64,")) {
//             console.error("🚨 Base64 이미지 데이터가 올바르지 않습니다.", base64Image);
//             return;
//         }

//         // ✅ 글리산도 이미지 추가 (Base64 인코딩된 데이터 사용)
//         let image = document.createElementNS("http://www.w3.org/2000/svg", "image");
//         image.setAttributeNS(null, "href", base64Image);
//         image.setAttributeNS(null, "x", xStart + (xEnd - xStart) / 2 - 10);
//         image.setAttributeNS(null, "y", yStart + (yEnd - yStart) / 2 - 5);
//         image.setAttributeNS(null, "width", `${xEnd - xStart + 20}`);
//         image.setAttributeNS(null, "height", "20");

//         svgContainer.appendChild(image);

//         console.log("🎵 글리산도 Base64 이미지 추가 완료!");
//     }, 500);
// }







//이미지를 음표로 삽입하기 위한 커서 위치
function getCursorPosition() {
    let cursorElement = osmd.cursor.cursorElement; // ✅ 커서 요소 가져오기
    if (!cursorElement) {
        console.error("🚨 커서 요소를 찾을 수 없습니다.");
        return null;
    }

    let cursorBBox = cursorElement.getBoundingClientRect(); // ✅ 커서의 위치 정보 가져오기
    console.log("🎯 커서 위치:", cursorBBox);
    
    return {
        x: cursorBBox.left + window.scrollX,  // X 좌표
        y: cursorBBox.top + window.scrollY,   // Y 좌표
    };
}
//✅ 이미지로 삽입하는 방법-SVG넣기
async function insertGhostNoteImage() {
    setTimeout(async () => {
        let svgContainer = document.querySelector("#osmdCanvas svg");
        let cursorPos = getCursorPosition();

        if (!svgContainer || !cursorPos) {
            console.error("🚨 SVG 컨테이너 또는 커서 위치를 찾을 수 없습니다.");
            return;
        }

        // ✅ Flutter에서 로컬 이미지 경로 가져오기
        let localImagePath = await window.flutter_inappwebview.callHandler("getLocalImagePath");

        // ✅ 고스트 노트 이미지 추가
        let image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttributeNS(null, "href", localImagePath); // ✅ 로컬 이미지 적용
        image.setAttributeNS(null, "x", cursorPos.x); // 커서 위치 기준 X 좌표
        image.setAttributeNS(null, "y", cursorPos.y); // 커서 위치 기준 Y 좌표
        image.setAttributeNS(null, "width", "30"); // 이미지 크기
        image.setAttributeNS(null, "height", "30");

        svgContainer.appendChild(image);

        console.log("🎵 고스트 노트 이미지 추가 완료!", cursorPos);
    }, 500);
}


async function insertGlissandoSVG() {
    setTimeout(async () => {
        let svgContainer = document.querySelector("#osmdCanvas svg");

        if (!svgContainer) {
            console.error("🚨 SVG 컨테이너를 찾을 수 없습니다.");
            return;
        }

        // ✅ 두 개의 음표 위치 가져오기
        let notes = svgContainer.querySelectorAll("g.vf-stavenote");
        if (notes.length < 2) {
            console.error("🚨 글리산도를 추가할 충분한 음표가 없습니다.");
            return;
        }

        let firstNote = notes[notes.length - 2]; // 마지막에서 두 번째 음표
        let secondNote = notes[notes.length - 1]; // 마지막 음표

        let firstBBox = firstNote.getBBox();
        let secondBBox = secondNote.getBBox();

        let startX = firstBBox.x + firstBBox.width;
        let startY = firstBBox.y + firstBBox.height / 2;
        let endX = secondBBox.x;
        let endY = secondBBox.y + secondBBox.height / 2;

        let middleX = (startX + endX) / 2;
        let middleY = (startY + endY) / 2;

        // ✅ Flutter에서 Base64 인코딩된 이미지 데이터 가져오기
        let base64Image = await window.flutter_inappwebview.callHandler("getLocalGlissandoImagePath");

        if (!base64Image.startsWith("data:image/svg+xml;base64,")) {
            console.error("🚨 Base64 이미지 데이터가 올바르지 않습니다.", base64Image);
            return;
        }

        // ✅ 이미지 추가 (음표 사이 위치에 배치)
        let image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttributeNS(null, "href", base64Image);
        image.setAttributeNS(null, "x", middleX - 15); // 글리산도가 정확히 중앙에 위치하도록 조정
        image.setAttributeNS(null, "y", middleY - 10);
        image.setAttributeNS(null, "width", "30");
        image.setAttributeNS(null, "height", "20");

        svgContainer.appendChild(image);
        console.log("🎵 글리산도 이미지 삽입 완료!");
    }, 200);
}
// 트레몰로-음표 막대기가 위로 된거에 svg걸치기
async function insertTremoloNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    // 🎵 **트레몰로 음표 생성**
    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "G"; // ✅ 기본 G 음 추가
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // ✅ 옥타브 4
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = "2"; // ✅ 기본 2분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // ✅ 2분음표

    // 🎵 **트레몰로 기호 추가**
    let notationsEl = xmlDoc.createElement("notations");
    let tremoloEl = xmlDoc.createElement("tremolo");
    tremoloEl.setAttribute("type", "single"); // ✅ 트레몰로 유형 설정
    tremoloEl.textContent = "3"; // ✅ 트레몰로 막대 개수 설정

    notationsEl.appendChild(tremoloEl);
    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);
    newNote.appendChild(notationsEl); // ✅ 트레몰로 기호 적용

    // ✅ 마디에 음표 추가
    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    // 🎵 트레몰로 SVG 이미지 추가
    addTremoloSVG();
}
// 트레몰로-음표 막대기가 아래로 된거에 svg걸치기
async function insertTremoloNoteWithStemDown() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    // 🎵 **트레몰로 음표 생성 (막대기 아래)**
    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // ✅ 기본 C 음 추가
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "3"; // ✅ 옥타브 3 (낮은 음)
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = "2"; // ✅ 기본 2분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // ✅ 2분음표

    let stemEl = xmlDoc.createElement("stem");
    stemEl.textContent = "down"; // ✅ 막대기 방향을 아래로 설정

    // 🎵 **트레몰로 기호 추가**
    let notationsEl = xmlDoc.createElement("notations");
    let tremoloEl = xmlDoc.createElement("tremolo");
    tremoloEl.setAttribute("type", "single");
    tremoloEl.textContent = "3"; // ✅ 트레몰로 막대 개수

    notationsEl.appendChild(tremoloEl);
    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);
    newNote.appendChild(stemEl); // ✅ 막대기 방향 설정
    newNote.appendChild(notationsEl); // ✅ 트레몰로 기호 추가

    // ✅ 마디에 음표 추가
    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    // 🎵 트레몰로 SVG 이미지 추가
    addTremoloSVG();
}

async function addTremoloSVG() {
    setTimeout(async () => {
        let svgContainer = document.querySelector("#osmdCanvas svg");

        if (!svgContainer) {
            console.error("🚨 SVG 컨테이너를 찾을 수 없습니다.");
            return;
        }

        let noteElements = svgContainer.querySelectorAll("g.vf-stavenote"); // ✅ 모든 음표 가져오기
        if (noteElements.length === 0) {
            console.error("🚨 음표를 찾을 수 없습니다.");
            return;
        }

        let lastNoteElement = noteElements[noteElements.length - 1]; // ✅ 마지막으로 추가된 음표 선택
        let lastNoteBBox = lastNoteElement.getBoundingClientRect(); // ✅ 음표 위치 계산

        console.log("🎯 마지막 음표 위치:", lastNoteBBox);

        // ✅ Flutter에서 트레몰로 이미지 가져오기
        let tremoloImagePath = await window.flutter_inappwebview.callHandler("getLocalTremoloImagePath");

        // ✅ 트레몰로 이미지 추가 (음표 막대기 위)
        let image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttributeNS(null, "href", tremoloImagePath); // ✅ 로컬 SVG 경로
        image.setAttributeNS(null, "x", lastNoteBBox.x + window.scrollX + 5); // ✅ 위치 조정
        image.setAttributeNS(null, "y", lastNoteBBox.y + window.scrollY - 15); // ✅ 위쪽으로 조정
        image.setAttributeNS(null, "width", "25"); // ✅ 이미지 크기 조절
        image.setAttributeNS(null, "height", "25");

        svgContainer.appendChild(image);

        console.log("🎵 트레몰로 SVG 추가 완료!", lastNoteBBox);
    }, 500);
}
//트레몰로 빔
async function insertTremoloBeam() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    // 🎵 **첫 번째 음표 생성**
    let firstNote = xmlDoc.createElement("note");

    let pitch1 = xmlDoc.createElement("pitch");
    let stepEl1 = xmlDoc.createElement("step");
    stepEl1.textContent = "C"; // ✅ C 음
    pitch1.appendChild(stepEl1);

    let octaveEl1 = xmlDoc.createElement("octave");
    octaveEl1.textContent = "4"; // ✅ 옥타브 4
    pitch1.appendChild(octaveEl1);

    let durationEl1 = xmlDoc.createElement("duration");
    durationEl1.textContent = "2"; // ✅ 기본 2분음표

    let typeEl1 = xmlDoc.createElement("type");
    typeEl1.textContent = "eighth"; // ✅ 8분음표

    let stemEl1 = xmlDoc.createElement("stem");
    stemEl1.textContent = "up"; // ✅ 막대기 위로 설정

    let beamEl1 = xmlDoc.createElement("beam");
    beamEl1.setAttribute("number", "1");
    beamEl1.textContent = "begin"; // ✅ 빔 시작

    firstNote.appendChild(pitch1);
    firstNote.appendChild(durationEl1);
    firstNote.appendChild(typeEl1);
    firstNote.appendChild(stemEl1);
    firstNote.appendChild(beamEl1);

    // 🎵 **두 번째 음표 생성**
    let secondNote = xmlDoc.createElement("note");

    let pitch2 = xmlDoc.createElement("pitch");
    let stepEl2 = xmlDoc.createElement("step");
    stepEl2.textContent = "E"; // ✅ E 음
    pitch2.appendChild(stepEl2);

    let octaveEl2 = xmlDoc.createElement("octave");
    octaveEl2.textContent = "4"; // ✅ 옥타브 4
    pitch2.appendChild(octaveEl2);

    let durationEl2 = xmlDoc.createElement("duration");
    durationEl2.textContent = "2"; // ✅ 기본 2분음표

    let typeEl2 = xmlDoc.createElement("type");
    typeEl2.textContent = "eighth"; // ✅ 8분음표

    let stemEl2 = xmlDoc.createElement("stem");
    stemEl2.textContent = "up"; // ✅ 막대기 위로 설정

    let beamEl2 = xmlDoc.createElement("beam");
    beamEl2.setAttribute("number", "1");
    beamEl2.textContent = "end"; // ✅ 빔 종료

    secondNote.appendChild(pitch2);
    secondNote.appendChild(durationEl2);
    secondNote.appendChild(typeEl2);
    secondNote.appendChild(stemEl2);
    secondNote.appendChild(beamEl2);

    // ✅ 마디에 음표 추가
    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(firstNote);
    parentMeasure.appendChild(secondNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 트레몰로 빔 추가 완료!");
}
// ✅ 트릴 추가
async function insertTrillNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // 기본값 C
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // 기본값 옥타브 4
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = 2; // 기본값 2분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // 기본값 2분음표

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 트릴(Trill) 기호 추가
    let notationsEl = xmlDoc.createElement("notations");
    let ornamentsEl = xmlDoc.createElement("ornaments");
    let trillEl = xmlDoc.createElement("trill-mark"); // 트릴 기호

    ornamentsEl.appendChild(trillEl);
    notationsEl.appendChild(ornamentsEl);
    newNote.appendChild(notationsEl);

    console.log("🎵 트릴(trill) 기호 추가 완료!");

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();
}
// ✅ 턴  추가
async function insertTurnNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // 기본값 C
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // 기본값 옥타브 4
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = 2; // 기본값 2분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // 기본값 2분음표

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 턴(Turn) 기호 추가
    let notationsEl = xmlDoc.createElement("notations");
    let ornamentsEl = xmlDoc.createElement("ornaments");
    let turnEl = xmlDoc.createElement("turn"); // 턴 기호

    ornamentsEl.appendChild(turnEl);
    notationsEl.appendChild(ornamentsEl);
    newNote.appendChild(notationsEl);

    console.log("🎵 턴(turn) 기호 추가 완료!");

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();
}
// ✅ 모르덴트 추가
async function insertMordentNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];
    let notesInMeasure = measureXml.getElementsByTagName("note");

    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // 기본값 C
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // 기본값 옥타브 4
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = 2; // 기본값 2분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "half"; // 기본값 2분음표

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 모르덴트(Mordent) 기호 추가
    let notationsEl = xmlDoc.createElement("notations");
    let ornamentsEl = xmlDoc.createElement("ornaments");
    let mordentEl = xmlDoc.createElement("mordent"); // 모르덴트 기호

    ornamentsEl.appendChild(mordentEl);
    notationsEl.appendChild(ornamentsEl);
    newNote.appendChild(notationsEl);

    console.log("🎵 모르덴트(mordent) 기호 추가 완료!");

    let parentMeasure = notesInMeasure[0].parentNode;
    parentMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();
}
// 크레센도 추가
async function insertCrescendo() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let wedgeEl = xmlDoc.createElement("wedge");

    wedgeEl.setAttribute("type", "crescendo"); // 크레센도 추가
    directionTypeEl.appendChild(wedgeEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 크레센도(crescendo) 추가 완료!");
}
// 디크레센도 추가
async function insertDecrescendo() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let wedgeEl = xmlDoc.createElement("wedge");

    wedgeEl.setAttribute("type", "diminuendo"); // 디크레센도 추가
    directionTypeEl.appendChild(wedgeEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 디크레센도(diminuendo) 추가 완료!");
}
//✅피아노ppp 추가
async function insertDynamicPPP() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let pppEl = xmlDoc.createElement("ppp"); // 🎵 ppp (피아노) 추가

    dynamicsEl.appendChild(pppEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 피아노(ppp) 다이내믹 마크 추가 완료!");
}
//✅피아니시모pp 추가
async function insertDynamicPP() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let ppEl = xmlDoc.createElement("pp"); // 🎵 피아니시모 (pp) 추가

    dynamicsEl.appendChild(ppEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 피아니시모(pp) 다이내믹 마크 추가 완료!");
}
//✅피아니시시모p 추가
async function insertDynamicP() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let pEl = xmlDoc.createElement("p"); // 🎵 피아노 (p) 추가

    dynamicsEl.appendChild(pEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 피아노 (p) 다이내믹 마크 추가 완료!");
}
//✅메조피아노mp 추가 
async function insertDynamicMP() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let mpEl = xmlDoc.createElement("mp"); // 🎵 메조 피아노 (mp) 추가

    dynamicsEl.appendChild(mpEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 메조 피아노 (mp) 다이내믹 마크 추가 완료!");
}
//✅메조피아노mf 추가 
async function insertDynamicMF() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let mfEl = xmlDoc.createElement("mf"); // 🎵 메조 포르테 (mf) 추가

    dynamicsEl.appendChild(mfEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 메조 포르테 (mf) 다이내믹 마크 추가 완료!");
}
//✅포르테(f) 추가
async function insertDynamicForte() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let forteEl = xmlDoc.createElement("f"); // 🎵 포르테 (f)

    dynamicsEl.appendChild(forteEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 포르테 (f) 추가 완료!");
}
//✅포르티시모(ff) 추가
async function insertDynamicFortissimo() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let ffEl = xmlDoc.createElement("ff"); // 🎵 포르티시모 (ff)

    dynamicsEl.appendChild(ffEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 포르티시모 (ff) 추가 완료!");
}
//✅포르티시시모(fff) 추가
async function insertDynamicFortississimo() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let fffEl = xmlDoc.createElement("fff"); // 🎵 포르티시시모 (fff)

    dynamicsEl.appendChild(fffEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 포르티시시모 (fff) 추가 완료!");
}
//✅스포르찬도 (sfz) 추가
async function insertDynamicSforzando() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let sfzEl = xmlDoc.createElement("sfz"); // 🎵 스포르찬도 (sfz)

    dynamicsEl.appendChild(sfzEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 스포르찬도 (sfz) 추가 완료!");
}
//✅린포르찬도 (rfz) 추가
async function insertDynamicRinforzando() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let rfzEl = xmlDoc.createElement("rfz"); // 🎵 린포르찬도 (rfz)

    dynamicsEl.appendChild(rfzEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 린포르찬도 (rfz) 추가 완료!");
}
//✅포르테피아노 (fp) 추가
async function insertDynamicFortePiano() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let fpoEl = xmlDoc.createElement("fp"); // 🎵 포르테피아노 (fp)

    dynamicsEl.appendChild(fpoEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 포르테피아노 (fp) 추가 완료!");
}
//✅피아노포르테 (pf) 추가
async function insertDynamicPianoForte() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let dynamicsEl = xmlDoc.createElement("dynamics");
    let pfEl = xmlDoc.createElement("pf"); // 🎵 피아노포르테 (pf)

    dynamicsEl.appendChild(pfEl);
    directionTypeEl.appendChild(dynamicsEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 피아노포르테 (pf) 추가 완료!");
}
//페달 시작 추가
async function insertPedalMarking() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    let directionEl = xmlDoc.createElement("direction");
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let pedalEl = xmlDoc.createElement("pedal");
    
    pedalEl.setAttribute("type", "start"); // 페달 시작
    directionTypeEl.appendChild(pedalEl);
    directionEl.appendChild(directionTypeEl);

    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 페달 시작 (Ped.) 추가 완료!");
}
//전통적인 페달 기호 추가
async function insertPedalText() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    // 🎵 <direction> 태그 생성
    let directionEl = xmlDoc.createElement("direction");
    directionEl.setAttribute("placement", "below"); // 아래쪽 배치

    // 🎵 <direction-type> 생성 후 텍스트 추가
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let wordsEl = xmlDoc.createElement("words");
    wordsEl.textContent = "Ped."; // 페달 시작 기호

    directionTypeEl.appendChild(wordsEl);
    directionEl.appendChild(directionTypeEl);
    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 'Ped.' 기호 추가 완료!");
}
//✅스타일 적용된 페달 기호 추가
async function insertStyledPedalText() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    // 🎵 <direction> 태그 생성
    let directionEl = xmlDoc.createElement("direction");
    directionEl.setAttribute("placement", "below"); // 악보 아래 배치

    // 🎵 <direction-type> 추가
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let wordsEl = xmlDoc.createElement("words");
    
    wordsEl.textContent = "𝆮";  // ✅ 이미지에서 보이는 페달 서체와 같은 기호 사용
    wordsEl.setAttribute("font-family", "Bravura"); // ✅ 브라뷰라(Bravura) 폰트 사용 (음악 기호 전용 폰트)
    wordsEl.setAttribute("font-size", "20"); // ✅ 적절한 크기로 설정

    directionTypeEl.appendChild(wordsEl);
    directionEl.appendChild(directionTypeEl);
    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 'Ped.' 기호가 스타일 적용된 서체로 추가됨!");
}

//페달 해제 기호 추가
async function insertPedalReleaseText() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let measureXml = xmlDoc.getElementsByTagName("measure")[osmd.cursor.iterator.currentMeasureIndex];

    // 🎵 <direction> 태그 생성
    let directionEl = xmlDoc.createElement("direction");
    directionEl.setAttribute("placement", "below"); // 아래쪽 배치

    // 🎵 <direction-type> 생성 후 텍스트 추가
    let directionTypeEl = xmlDoc.createElement("direction-type");
    let wordsEl = xmlDoc.createElement("words");
    wordsEl.textContent = "*"; // 페달 해제 기호

    directionTypeEl.appendChild(wordsEl);
    directionEl.appendChild(directionTypeEl);
    measureXml.appendChild(directionEl);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '*' 페달 해제 기호 추가 완료!");
}
//✅Bar line 추가
async function insertBarLine() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디를 찾기
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures[measures.length - 1];

    // ✅ 새로운 마디 추가
    let newMeasure = xmlDoc.createElement("measure");
    newMeasure.setAttribute("number", measures.length + 1);

    // ✅ 마디줄 추가
    let barline = xmlDoc.createElement("barline");
    barline.setAttribute("location", "right"); // ✅ 마디 끝에 위치하도록 설정
    let barStyle = xmlDoc.createElement("bar-style");
    barStyle.textContent = "regular"; // ✅ 기본 마디줄 스타일

    barline.appendChild(barStyle);
    newMeasure.appendChild(barline);
    part.appendChild(newMeasure);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 일반 마디줄이 추가되었습니다!");
}
//✅이중 바 라인(기획문서에서 Bar Line) 추가
async function insertDoubleBarLine() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디 가져오기
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures[measures.length - 1];

    // ✅ 새로운 마디 추가
    let newMeasure = xmlDoc.createElement("measure");
    newMeasure.setAttribute("number", measures.length + 1);

    // ✅ 곡의 끝을 나타내는 마디줄 추가
    let barline = xmlDoc.createElement("barline");
    barline.setAttribute("location", "right");
    let barStyle = xmlDoc.createElement("bar-style");
    barStyle.textContent = "light-heavy"; // ✅ 곡 끝 표시 (굵은 이중 마디줄)

    barline.appendChild(barStyle);
    newMeasure.appendChild(barline);
    part.appendChild(newMeasure);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 곡 끝 마디줄(이중 바 라인)이 추가되었습니다!");
}
//✅반복 마디줄 추가
async function insertRepeatBarLine(type = "forward") {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디 가져오기
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures[measures.length - 1];

    // ✅ 새로운 마디 추가
    let newMeasure = xmlDoc.createElement("measure");
    newMeasure.setAttribute("number", measures.length + 1);

    // ✅ 반복 마디줄 추가
    let barline = xmlDoc.createElement("barline");
    barline.setAttribute("location", "right");
    let barStyle = xmlDoc.createElement("bar-style");
    barStyle.textContent = "heavy-light"; // ✅ 기본적인 반복 마디줄 스타일

    let repeat = xmlDoc.createElement("repeat");
    repeat.setAttribute("direction", type); // ✅ "forward" = 시작 / "backward" = 끝

    barline.appendChild(barStyle);
    barline.appendChild(repeat);
    newMeasure.appendChild(barline);
    part.appendChild(newMeasure);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log(`🎵 반복 마디줄(${type})이 추가되었습니다!`);
}
//✅오른쪽도돌이표
async function insertRepeatBarLineForward() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 첫 번째 마디 가져오기 (반복 시작을 나타내야 하므로 첫 마디에 추가)
    let measures = part.getElementsByTagName("measure");
    let firstMeasure = measures[0];

    // ✅ 반복 마디줄 추가
    let barline = xmlDoc.createElement("barline");
    barline.setAttribute("location", "left");

    let barStyle = xmlDoc.createElement("bar-style");
    barStyle.textContent = "heavy-light"; // ✅ 반복 마디줄 스타일

    let repeat = xmlDoc.createElement("repeat");
    repeat.setAttribute("direction", "forward"); // ✅ 반복 시작

    barline.appendChild(barStyle);
    barline.appendChild(repeat);
    firstMeasure.appendChild(barline);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 오른쪽 도돌이표(Forward Repeat Bar Line) 추가됨!");
}
//✅왼쪽도돌이표
async function insertRepeatBarLineBackward() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디 가져오기 (반복 종료를 나타내야 하므로 마지막 마디에 추가)
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures[measures.length - 1];

    // ✅ 반복 마디줄 추가
    let barline = xmlDoc.createElement("barline");
    barline.setAttribute("location", "right");

    let barStyle = xmlDoc.createElement("bar-style");
    barStyle.textContent = "heavy-light"; // ✅ 반복 마디줄 스타일

    let repeat = xmlDoc.createElement("repeat");
    repeat.setAttribute("direction", "backward"); // ✅ 반복 끝

    barline.appendChild(barStyle);
    barline.appendChild(repeat);
    lastMeasure.appendChild(barline);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 왼쪽 도돌이표(Backward Repeat Bar Line) 추가됨!");
}
//✅Coda 추가
async function insertCodaSymbol() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 첫 번째 마디에 Coda 추가
    let measures = part.getElementsByTagName("measure");
    let firstMeasure = measures[0];

    // ✅ 코다(Coda) 기호 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let coda = xmlDoc.createElement("coda");

    directionType.appendChild(coda);
    direction.appendChild(directionType);
    firstMeasure.appendChild(direction);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 코다(Coda) 기호 추가됨!");
}
//✅세뇨 추가
async function insertSegnoSymbol() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 첫 번째 마디에 Segno 추가
    let measures = part.getElementsByTagName("measure");
    let firstMeasure = measures[0];

    // ✅ 세뇨(Segno) 기호 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let segno = xmlDoc.createElement("segno");

    directionType.appendChild(segno);
    direction.appendChild(directionType);
    firstMeasure.appendChild(direction);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 세뇨(Segno) 기호 추가됨!");
}
//✅피네 추가
async function insertFineSymbol() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디에 Fine 추가
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures[measures.length - 1];

    // ✅ Fine(피네) 기호 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let fine = xmlDoc.createElement("words");
    fine.textContent = "Fine"; // ✅ Fine 텍스트 추가

    directionType.appendChild(fine);
    direction.appendChild(directionType);
    lastMeasure.appendChild(direction);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 Fine(피네) 기호 추가됨!");
}
//✅To Coda 추가
async function insertToCodaSymbol() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ To Coda 기호를 추가할 위치 (마지막 마디)
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures[measures.length - 1];

    // ✅ To Coda 기호 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let toCoda = xmlDoc.createElement("words");
    toCoda.textContent = "To Coda"; // ✅ To Coda 텍스트 추가

    directionType.appendChild(toCoda);
    direction.appendChild(directionType);
    lastMeasure.appendChild(direction);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 To Coda 기호 추가됨!");
}
//✅D.S.달세뇨 추가
async function insertDalSegnoWithText() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ D.S. 기호를 추가할 위치 (예: 첫 번째 마디)
    let measures = part.getElementsByTagName("measure");
    let firstMeasure = measures[0];

    // ✅ <direction> 요소 생성
    let direction = xmlDoc.createElement("direction");
    direction.setAttribute("placement", "above"); // 악보 위에 배치

    // ✅ <direction-type> 요소 생성
    let directionType = xmlDoc.createElement("direction-type");

    // ✅ 1) "D.S." 텍스트 추가
    let words = xmlDoc.createElement("words");
    words.textContent = "D.S."; // ✅ "D.S."라는 글자 표시

    // ✅ 2) 달 세뇨(𝄋) 기호 추가
    let segno = xmlDoc.createElement("segno");

    directionType.appendChild(words);
    directionType.appendChild(segno);
    direction.appendChild(directionType);
    firstMeasure.appendChild(direction); // ✅ 첫 번째 마디에 추가

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎼 'D.S.' (달 세뇨) 기호 + 텍스트 추가됨!");
}
//✅ D.C.다 카포
async function insertDaCapo() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ D.C. 기호를 추가할 위치 (예: 마지막 마디)
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures[measures.length - 1]; // 마지막 마디

    // ✅ <direction> 요소 생성
    let direction = xmlDoc.createElement("direction");
    direction.setAttribute("placement", "below"); // 악보 아래에 배치

    // ✅ <direction-type> 요소 생성
    let directionType = xmlDoc.createElement("direction-type");

    // ✅ "D.C." 텍스트 추가
    let words = xmlDoc.createElement("words");
    words.textContent = "D.C."; // ✅ "D.C." 표시

    directionType.appendChild(words);
    direction.appendChild(directionType);
    lastMeasure.appendChild(direction); // ✅ 마지막 마디에 추가

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎼 'D.C.' (다 카포) 추가됨!");
}
//✅엔딩 추가
async function insertEnding() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 엔딩을 추가할 위치 (예: 마지막 두 마디)
    let measures = part.getElementsByTagName("measure");
    if (measures.length < 2) {
        console.warn("❌ 최소 2개의 마디가 필요합니다.");
        return;
    }

    let firstEndingMeasure = measures[measures.length - 2]; // 마지막에서 두 번째 마디 (1st 엔딩)
    let secondEndingMeasure = measures[measures.length - 1]; // 마지막 마디 (2nd 엔딩)

    // ✅ 1st 엔딩 태그 추가
    let firstEnding = xmlDoc.createElement("ending");
    firstEnding.setAttribute("number", "1"); // 1st 엔딩
    firstEnding.setAttribute("type", "start"); // 시작 태그
    firstEnding.textContent = "1."; // 표시될 텍스트

    let firstBarline = firstEndingMeasure.getElementsByTagName("barline")[0];
    if (!firstBarline) {
        firstBarline = xmlDoc.createElement("barline");
        firstEndingMeasure.appendChild(firstBarline);
    }
    firstBarline.appendChild(firstEnding);

    // ✅ 2nd 엔딩 태그 추가
    let secondEnding = xmlDoc.createElement("ending");
    secondEnding.setAttribute("number", "2"); // 2nd 엔딩
    secondEnding.setAttribute("type", "stop"); // 종료 태그
    secondEnding.textContent = "2.";

    let secondBarline = secondEndingMeasure.getElementsByTagName("barline")[0];
    if (!secondBarline) {
        secondBarline = xmlDoc.createElement("barline");
        secondEndingMeasure.appendChild(secondBarline);
    }
    secondBarline.appendChild(secondEnding);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎼 '1st & 2nd 엔딩' 추가됨!");
}
//엔딩 추가(엔딩 기호 안에 숫자 포함)
async function insertEndingWithNumber() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 엔딩을 추가할 위치 (예: 마지막 두 마디)
    let measures = part.getElementsByTagName("measure");
    if (measures.length < 2) {
        console.warn("❌ 최소 2개의 마디가 필요합니다.");
        return;
    }

    let firstEndingMeasure = measures[measures.length - 2]; // 마지막에서 두 번째 마디 (1st 엔딩)
    let secondEndingMeasure = measures[measures.length - 1]; // 마지막 마디 (2nd 엔딩)

    // ✅ 1st 엔딩 추가
    let firstEnding = xmlDoc.createElement("ending");
    firstEnding.setAttribute("number", "1"); // 1st 엔딩
    firstEnding.setAttribute("type", "start"); // 시작 태그
    firstEnding.setAttribute("placement", "above"); // 악보 위에 표시
    firstEnding.textContent = "1."; // ✅ 숫자를 직접 입력

    let firstBarline = firstEndingMeasure.getElementsByTagName("barline")[0];
    if (!firstBarline) {
        firstBarline = xmlDoc.createElement("barline");
        firstEndingMeasure.appendChild(firstBarline);
    }
    firstBarline.appendChild(firstEnding);

    // ✅ 2nd 엔딩 추가
    let secondEnding = xmlDoc.createElement("ending");
    secondEnding.setAttribute("number", "2"); // 2nd 엔딩
    secondEnding.setAttribute("type", "stop"); // 종료 태그
    secondEnding.setAttribute("placement", "above"); // 악보 위에 표시
    secondEnding.textContent = "2."; // ✅ 숫자를 직접 입력

    let secondBarline = secondEndingMeasure.getElementsByTagName("barline")[0];
    if (!secondBarline) {
        secondBarline = xmlDoc.createElement("barline");
        secondEndingMeasure.appendChild(secondBarline);
    }
    secondBarline.appendChild(secondEnding);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎼 '1st & 2nd 엔딩' 추가됨 (숫자 포함)!");
}
//✅리타르단도  추가
async function insertRitardando() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 템포 지시어를 추가할 위치 (마지막 마디)
    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디에 추가

    // ✅ 리타르단도(rit.) 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let words = xmlDoc.createElement("words");
    
    words.textContent = "rit."; // 🎵 리타르단도(rit.) 표시
    words.setAttribute("font-weight", "bold"); // 진하게
    words.setAttribute("font-style", "italic"); // 기울이기

    directionType.appendChild(words);
    direction.appendChild(directionType);

    // ✅ 마지막 마디에 추가
    targetMeasure.insertBefore(direction, targetMeasure.firstChild);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '리타르단도 (rit.)' 추가 완료!");
}
//✅아첼레란도 (accel.)' 추가
async function insertAccelerando() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 템포 지시어를 추가할 위치 (마지막 마디)
    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디에 추가

    // ✅ 아첼레란도(accel.) 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let words = xmlDoc.createElement("words");
    
    words.textContent = "accel."; // 🎵 아첼레란도(accel.) 표시
    words.setAttribute("font-weight", "bold"); // 진하게
    words.setAttribute("font-style", "italic"); // 기울이기

    directionType.appendChild(words);
    direction.appendChild(directionType);

    // ✅ 마지막 마디에 추가
    targetMeasure.insertBefore(direction, targetMeasure.firstChild);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '아첼레란도 (accel.)' 추가 완료!");
}
//마르카토 추가
async function insertNoteWithMarcato() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디 가져오기 (없으면 첫 번째 마디 생성)
    let measures = part.getElementsByTagName("measure");
    let lastMeasure;
    if (measures.length === 0) {
        lastMeasure = xmlDoc.createElement("measure");
        lastMeasure.setAttribute("number", "1");
        part.appendChild(lastMeasure);
    } else {
        lastMeasure = measures[measures.length - 1];
    }

    // ✅ 새 음표 추가
    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C";  // 기본 음 높이 (C)
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // 옥타브 (중앙 C)
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = "4"; // 4분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "quarter"; // 4분음표 설정

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 마르카토(Marcato) 기호 추가
    let notations = xmlDoc.createElement("notations");
    let articulations = xmlDoc.createElement("articulations");
    let marcato = xmlDoc.createElement("marcato");

    articulations.appendChild(marcato);
    notations.appendChild(articulations);
    newNote.appendChild(notations);

    // ✅ 음표를 마디에 추가
    lastMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 새 음표 추가 및 마르카토 적용 완료!");
    console.log(new XMLSerializer().serializeToString(xmlDoc).includes("marcato"));

}
//svg마르카토
async function insertMarcatoWithSVG() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디 가져오기
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures.length === 0 ? xmlDoc.createElement("measure") : measures[measures.length - 1];

    // ✅ 새로운 음표 추가
    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "E"; // 기본 음 높이
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // 옥타브 설정
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = "4"; // 4분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "quarter"; // 음표 타입

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 음표 추가
    lastMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);
    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 음표 추가 완료, 이제 SVG 추가!");

    // ✅ 마르카토 SVG 추가
    addMarcatoSVGToNote();
}

// ✅ SVG를 음표 위에 추가하는 함수
function addMarcatoSVGToNote() {
    setTimeout(() => {
        let noteElements = document.querySelectorAll(".vf-notehead"); // 음표 찾기
        if (noteElements.length === 0) {
            console.warn("🚨 음표를 찾을 수 없습니다.");
            return;
        }

        let lastNote = noteElements[noteElements.length - 1]; // 마지막 추가된 음표
        let svgNS = "http://www.w3.org/2000/svg";

        let marcatoSVG = document.createElementNS(svgNS, "path");
        marcatoSVG.setAttribute("d", "M10,5 L15,15 L5,15 Z"); // 삼각형 (마르카토 기호)
        marcatoSVG.setAttribute("fill", "black");
        marcatoSVG.setAttribute("stroke", "black");
        marcatoSVG.setAttribute("stroke-width", "1");
        marcatoSVG.setAttribute("transform", "translate(0,-20)"); // 음표 위로 이동

        lastNote.parentNode.appendChild(marcatoSVG);
        console.log("🎵 SVG 마르카토 추가됨!");
    }, 500);
}
async function insertMarcatoWithImage() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 마지막 마디 가져오기
    let measures = part.getElementsByTagName("measure");
    let lastMeasure = measures.length === 0 ? xmlDoc.createElement("measure") : measures[measures.length - 1];

    // ✅ 새로운 음표 추가
    let newNote = xmlDoc.createElement("note");

    let pitch = xmlDoc.createElement("pitch");
    let stepEl = xmlDoc.createElement("step");
    stepEl.textContent = "C"; // 기본 음 높이
    pitch.appendChild(stepEl);

    let octaveEl = xmlDoc.createElement("octave");
    octaveEl.textContent = "4"; // 옥타브 설정
    pitch.appendChild(octaveEl);

    let durationEl = xmlDoc.createElement("duration");
    durationEl.textContent = "4"; // 4분음표

    let typeEl = xmlDoc.createElement("type");
    typeEl.textContent = "quarter"; // 음표 타입

    newNote.appendChild(pitch);
    newNote.appendChild(durationEl);
    newNote.appendChild(typeEl);

    // ✅ 음표 추가
    lastMeasure.appendChild(newNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);
    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 음표 추가 완료, 이제 Base64 이미지 추가!");

    // ✅ 마르카토 이미지 추가
    addMarcatoImageToNote();
}

// ✅ Base64 이미지를 음표 위에 추가하는 함수
async function addMarcatoImageToNote() {
    let base64Image = await window.flutter_inappwebview.callHandler('getLocalImagePath');
    console.log("🎨 Base64 이미지 경로: ", base64Image); // ✅ Base64 데이터 출력

    if (!base64Image.startsWith("data:image/svg+xml;base64,")) {
        console.warn("🚨 Base64 이미지가 잘못됨!");
        return;
    }
    setTimeout(() => {
        let noteElements = document.querySelectorAll(".vf-notehead"); // 음표 찾기
        if (noteElements.length === 0) {
            console.warn("🚨 음표를 찾을 수 없습니다.");
            return;
        }

        let lastNote = noteElements[noteElements.length - 1]; // 마지막 추가된 음표
        let img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        // img.src = base64Image;
        // img.style.position = "absolute";
        // img.style.width = "200px"; // 이미지 크기 조절
        // img.style.height = "200px";
        // img.style.transform = "translate(0,-20px)"; // 음표 위로 이동
///
img.setAttributeNS(null, "href", localImagePath); // ✅ 로컬 이미지 적용
img.setAttributeNS(null, "x", cursorPos.x); // 커서 위치 기준 X 좌표
img.setAttributeNS(null, "y", cursorPos.y); // 커서 위치 기준 Y 좌표
img.setAttributeNS(null, "width", "30"); // 이미지 크기
img.setAttributeNS(null, "height", "30");
        lastNote.parentNode.appendChild(img);
        console.log("🎵 Base64 이미지 마르카토 추가됨!");
    }, 500);
}
//✅악센트 추가
async function insertAccent() {
    if (!originalFileData) {
        console.warn("❌ 원본 악보 데이터가 없습니다.");
        return;
    }

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    // ✅ 악센트를 추가할 음표 찾기 (마지막 마디의 첫 번째 음표)
    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디
    let notes = targetMeasure.getElementsByTagName("note");
    if (notes.length === 0) {
        console.warn("❌ 음표가 없습니다.");
        return;
    }

    let targetNote = notes[0]; // 첫 번째 음표에 추가

    // ✅ 악센트 추가
    let notations = xmlDoc.createElement("notations");
    let articulations = xmlDoc.createElement("articulations");
    let accent = xmlDoc.createElement("accent");

    articulations.appendChild(accent);
    notations.appendChild(articulations);

    // ✅ 기존 <notations>이 있는 경우, 새로운 요소 추가
    let existingNotations = targetNote.getElementsByTagName("notations")[0];
    if (existingNotations) {
        existingNotations.appendChild(articulations);
    } else {
        targetNote.appendChild(notations);
    }

    // ✅ XML을 다시 문자열로 변환하여 적용
    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    // ✅ OSMD에 반영
    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '악센트 (>)' 추가 완료!");
}
//✅숨표 추가
async function insertBreathMark() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디
    let lastNote = targetMeasure.getElementsByTagName("note");
    
    if (lastNote.length === 0) {
        console.warn("❌ 추가할 음표가 없습니다.");
        return;
    }

    // ✅ 숨표 추가
    let notations = xmlDoc.createElement("notations");
    let articulation = xmlDoc.createElement("articulations");
    let breathMark = xmlDoc.createElement("breath-mark");

    breathMark.setAttribute("type", "comma"); // 숨표 타입 지정
    articulation.appendChild(breathMark);
    notations.appendChild(articulation);

    lastNote[lastNote.length - 1].appendChild(notations); // 마지막 음표에 숨표 추가

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '숨표' 추가 완료!");
}
//카에수라 추가
async function insertNoteWithCaesura() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // ✅ 마지막 마디 찾기

    // ✅ 새로운 쉼표 추가 (카에수라 기호는 쉼표에 종속됨)
    let note = xmlDoc.createElement("note");
    let rest = xmlDoc.createElement("rest");
    let duration = xmlDoc.createElement("duration");
    let voice = xmlDoc.createElement("voice");
    let type = xmlDoc.createElement("type");

    duration.textContent = "1"; // 기본 지속 시간
    voice.textContent = "1";
    type.textContent = "quarter"; // 4분 쉼표

    note.appendChild(rest);
    note.appendChild(duration);
    note.appendChild(voice);
    note.appendChild(type);

    // ✅ 카에수라(Caesura) 추가 (쉼표에 종속됨)
    let notations = xmlDoc.createElement("notations");
    let articulation = xmlDoc.createElement("articulations");
    let caesura = xmlDoc.createElement("caesura");

    caesura.setAttribute("type", "normal"); // "//" 모양의 일반 카에수라

    articulation.appendChild(caesura);
    notations.appendChild(articulation);
    note.appendChild(notations); // ✅ 쉼표에 카에수라 적용

    // ✅ 마지막 마디에 새로운 쉼표 추가
    targetMeasure.appendChild(note);

    // ✅ XML 다시 문자열화 후 OSMD 렌더링
    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '카에수라가 있는 새로운 쉼표' 추가 완료!");
}
//아래거 아치아카투라 아니고 꾸밈음임
async function insertGgumimNote() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // ✅ 마지막 마디 찾기
    let notes = targetMeasure.getElementsByTagName("note");

    if (notes.length === 0) {
        console.warn("❌ 본 음표가 없습니다. 먼저 본 음표를 추가하세요.");
        return;
    }

    let mainNote = notes[0]; // ✅ 첫 번째 본 음표 선택

    // ✅ 아치아카투라(Acciaccatura) 음표 생성
    let graceNote = xmlDoc.createElement("note");
    let pitch = xmlDoc.createElement("pitch");
    let step = xmlDoc.createElement("step");
    let octave = xmlDoc.createElement("octave");
    let alter = xmlDoc.createElement("alter");
    let duration = xmlDoc.createElement("duration");
    let voice = xmlDoc.createElement("voice");
    let type = xmlDoc.createElement("type");
    let grace = xmlDoc.createElement("grace"); // 🎵 아치아카투라 추가
    let notations = xmlDoc.createElement("notations");

    step.textContent = "E"; // 장식음의 기본 음 (E)
    octave.textContent = "5"; // 옥타브 설정
    alter.textContent = "0"; // 변조 없음

    duration.textContent = "1"; // 장식음의 지속 시간
    voice.textContent = "1";
    type.textContent = "eighth"; // 8분 음표 형태

    pitch.appendChild(step);
    pitch.appendChild(octave);
    pitch.appendChild(alter);

    graceNote.appendChild(grace); // ✅ 아치아카투라 적용
    graceNote.appendChild(pitch);
    graceNote.appendChild(duration);
    graceNote.appendChild(voice);
    graceNote.appendChild(type);
    graceNote.appendChild(notations);

    // ✅ 본 음표 앞에 아치아카투라 추가
    targetMeasure.insertBefore(graceNote, mainNote);

    // ✅ XML 다시 문자열화 후 OSMD 렌더링
    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '아치아카투라(Acciaccatura)' 추가 완료!");
}
//아치아투카라 추가
async function insertAcciaccatura() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디

    // ✅ "기본 음표" 추가 (E5, 4분 음표)
    let mainNote = xmlDoc.createElement("note");
    mainNote.appendChild(createPitch(xmlDoc, "E", 5));
    mainNote.appendChild(createElementWithText(xmlDoc, "type", "quarter"));
    mainNote.appendChild(createElementWithText(xmlDoc, "voice", "1"));
    mainNote.appendChild(createElementWithText(xmlDoc, "stem", "up"));

    // ✅ "아치아카투라(Acciaccatura)" 추가 (D5, 8분 음표)
    let graceNote = xmlDoc.createElement("note");
    graceNote.appendChild(createElement(xmlDoc, "grace", { slash: "yes" })); // ✅ 빗금 추가
    graceNote.appendChild(createPitch(xmlDoc, "D", 5));
    graceNote.appendChild(createElementWithText(xmlDoc, "type", "eighth"));
    graceNote.appendChild(createElementWithText(xmlDoc, "voice", "1"));
    graceNote.appendChild(createElementWithText(xmlDoc, "stem", "up"));

    // ✅ 장식음과 기본 음표를 연결하는 슬러(Slur) 추가
    let notations = xmlDoc.createElement("notations");
    let slur = xmlDoc.createElement("slur");
    slur.setAttribute("type", "start");
    notations.appendChild(slur);
    graceNote.appendChild(notations);

    // ✅ 기본 음표 앞에 아치아카투라 추가
    targetMeasure.appendChild(graceNote);
    targetMeasure.appendChild(mainNote);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '아치아카투라' 추가 완료!");
}

// 🎼 음표 Pitch 생성 함수
function createPitch(xmlDoc, step, octave) {
    let pitch = xmlDoc.createElement("pitch");
    pitch.appendChild(createElementWithText(xmlDoc, "step", step));
    pitch.appendChild(createElementWithText(xmlDoc, "octave", octave));
    return pitch;
}

// 📌 XML 태그 생성 함수 (속성 없음)
function createElement(xmlDoc, tagName, attributes = {}) {
    let element = xmlDoc.createElement(tagName);
    for (let key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
    return element;
}

// 📌 XML 태그 생성 함수 (텍스트 포함)
function createElementWithText(xmlDoc, tagName, text) {
    let element = xmlDoc.createElement(tagName);
    element.textContent = text;
    return element;
}






//1. 아무것도 없는 악보 생성
async function createEmptyScore() {
    const emptyScoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
    <part-list>
        <score-part id="P1">
            <part-name>Tremolo Example</part-name>
        </score-part>
    </part-list>
    <part id="P1">
        <measure number="1">
            <attributes>
                <divisions>8</divisions> 
                <key><fifths>0</fifths></key>
                <time>
                    <beats>4</beats>
                    <beat-type>4</beat-type>
                </time>
                <clef>
                    <sign>G</sign>
                    <line>2</line>
                </clef>
            </attributes>

            <!-- 트레몰로 빔이 적용된 두 개의 8분음표 -->
            <note>
                <pitch>
                    <step>C</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>eighth</type>
                <beam number="1">begin</beam>
                <notations>
                    <tremolo type="start">3</tremolo> <!-- 트레몰로 3줄 -->
                </notations>
            </note>

            <note>
                <pitch>
                    <step>E</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>eighth</type>
                <beam number="1">end</beam>
                <notations>
                    <tremolo type="stop">3</tremolo>
                </notations>
            </note>
        </measure>
    </part>
</score-partwise>

    `;

    originalFileData = emptyScoreXML; // ✅ 원본 데이터 업데이트
    await osmd.load(originalFileData); 
    await osmd.render();

    // ✅ 빈 악보가 렌더링된 후 커서 초기화 및 표시
    osmd.cursor.show();
    osmd.cursor.reset();

    alert("🎵 악보 생성 완료!");
    console.log("🎵 악보 생성 완료!");
}
// ✅ 아치아카투라 (D5) 추가
async function createAcciaccaturaScore() {
    const emptyScoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
    <part-list>
        <score-part id="P1">
            <part-name>Acciaccatura Test</part-name>
        </score-part>
    </part-list>
    <part id="P1">
        <measure number="1">
            <attributes>
                <divisions>8</divisions>
                <key><fifths>0</fifths></key>
                <time>
                    <beats>4</beats>
                    <beat-type>4</beat-type>
                </time>
                <clef>
                    <sign>G</sign>
                    <line>2</line>
                </clef>
            </attributes>

            <!-- ✅ 아치아카투라 (D5) -->
            <note>
                <grace slash="yes"/> <!-- 빗금 있는 아치아카투라 -->
                <pitch>
                    <step>D</step>
                    <octave>5</octave>
                </pitch>
                <type>eighth</type>
                <voice>1</voice>
                <stem>up</stem>
                <notations>
                    <slur type="start"/>
                </notations>
            </note>

            <!-- ✅ 기본 음표 (E5, 4분 음표) -->
            <note>
                <pitch>
                    <step>E</step>
                    <octave>5</octave>
                </pitch>
                <duration>4</duration>
                <type>quarter</type>
                <voice>1</voice>
                <stem>up</stem>
                <notations>
                    <slur type="stop"/>
                </notations>
            </note>

        </measure>
    </part>
</score-partwise>

    `;

    originalFileData = emptyScoreXML; // ✅ 원본 데이터 업데이트
    await osmd.load(originalFileData); 
    await osmd.render();

    // ✅ 빈 악보가 렌더링된 후 커서 초기화 및 표시
    osmd.cursor.show();
    osmd.cursor.reset();

    alert("🎵 악보 생성 완료!");
    console.log("🎵 악보 생성 완료!");
}
// ✅ 꾸밈음 추가
async function createGracenoteScore() {
    const emptyScoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
    <part-list>
        <score-part id="P1">
            <part-name>Acciaccatura Test</part-name>
        </score-part>
    </part-list>
    <part id="P1">
        <measure number="1">
            <attributes>
                <divisions>8</divisions>
                <key><fifths>0</fifths></key>
                <time>
                    <beats>4</beats>
                    <beat-type>4</beat-type>
                </time>
                <clef>
                    <sign>G</sign>
                    <line>2</line>
                </clef>
            </attributes>

            <!-- ✅ 아치아카투라 (D5) -->
            <note>
                <grace slash="yes"/> <!-- 빗금 있는 아치아카투라 -->
                <pitch>
                    <step>D</step>
                    <octave>5</octave>
                </pitch>
                <type>eighth</type>
                <voice>1</voice>
                <stem>up</stem>
                <notations>
                    <slur type="start"/>
                </notations>
            </note>

            <!-- ✅ 기본 음표 (E5, 4분 음표) -->
            <note>
                <pitch>
                    <step>E</step>
                    <octave>5</octave>
                </pitch>
                <duration>4</duration>
                <type>quarter</type>
                <voice>1</voice>
                <stem>up</stem>
                <notations>
                    <slur type="stop"/>
                </notations>
            </note>

        </measure>
    </part>
</score-partwise>

    `;

    originalFileData = emptyScoreXML; // ✅ 원본 데이터 업데이트
    await osmd.load(originalFileData); 
    await osmd.render();

    // ✅ 빈 악보가 렌더링된 후 커서 초기화 및 표시
    osmd.cursor.show();
    osmd.cursor.reset();

    alert("🎵 악보 생성 완료!");
    console.log("🎵 악보 생성 완료!");
}
async function insertGhostNoteTest() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디

    // ✅ 고스트 노트 추가
    let note = xmlDoc.createElement("note");
    let pitch = xmlDoc.createElement("pitch");
    let step = xmlDoc.createElement("step");
    let octave = xmlDoc.createElement("octave");
    let duration = xmlDoc.createElement("duration");
    let voice = xmlDoc.createElement("voice");
    let type = xmlDoc.createElement("type");
    let stem = xmlDoc.createElement("stem");
    let notations = xmlDoc.createElement("notations");
    let notehead = xmlDoc.createElement("notehead");

    step.textContent = "C";  // 음 높이 (C)
    octave.textContent = "4";  // 옥타브
    duration.textContent = "4";  // 지속 시간 (4분음표)
    voice.textContent = "1";
    type.textContent = "quarter";  // 4분음표
    stem.textContent = "up";  // 위쪽으로 향하는 음표 막대

    notehead.textContent = "normal";  // 일반적인 음표 머리
    notehead.setAttribute("parentheses", "yes");  // ✅ 괄호 추가 (고스트 노트 표기)

    pitch.appendChild(step);
    pitch.appendChild(octave);

    notations.appendChild(notehead);
    note.appendChild(pitch);
    note.appendChild(duration);
    note.appendChild(voice);
    note.appendChild(type);
    note.appendChild(stem);
    note.appendChild(notations);

    targetMeasure.appendChild(note);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '고스트 노트' 추가 완료!");
}
//✅이음줄 추가
async function insertSlurNotes() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디

    // ✅ 첫 번째 음표 (C4)
    let note1 = xmlDoc.createElement("note");
    let pitch1 = xmlDoc.createElement("pitch");
    let step1 = xmlDoc.createElement("step");
    let octave1 = xmlDoc.createElement("octave");
    let duration1 = xmlDoc.createElement("duration");
    let voice1 = xmlDoc.createElement("voice");
    let type1 = xmlDoc.createElement("type");
    let stem1 = xmlDoc.createElement("stem");
    let notations1 = xmlDoc.createElement("notations");
    let tied1 = xmlDoc.createElement("tied");

    step1.textContent = "C"; // 음높이 C
    octave1.textContent = "4"; // 옥타브 4
    duration1.textContent = "2"; // 2분음표
    voice1.textContent = "1";
    type1.textContent = "quarter"; // 4분음표
    stem1.textContent = "up";

    tied1.setAttribute("type", "start"); // 시작 음표에 이음줄 시작

    pitch1.appendChild(step1);
    pitch1.appendChild(octave1);
    notations1.appendChild(tied1);

    note1.appendChild(pitch1);
    note1.appendChild(duration1);
    note1.appendChild(voice1);
    note1.appendChild(type1);
    note1.appendChild(stem1);
    note1.appendChild(notations1);

    // ✅ 두 번째 음표 (D4)
    let note2 = xmlDoc.createElement("note");
    let pitch2 = xmlDoc.createElement("pitch");
    let step2 = xmlDoc.createElement("step");
    let octave2 = xmlDoc.createElement("octave");
    let duration2 = xmlDoc.createElement("duration");
    let voice2 = xmlDoc.createElement("voice");
    let type2 = xmlDoc.createElement("type");
    let stem2 = xmlDoc.createElement("stem");
    let notations2 = xmlDoc.createElement("notations");
    let tied2 = xmlDoc.createElement("tied");
    let slur = xmlDoc.createElement("slur");

    step2.textContent = "D"; // 음높이 D
    octave2.textContent = "4"; // 옥타브 4
    duration2.textContent = "2"; // 2분음표
    voice2.textContent = "1";
    type2.textContent = "quarter"; // 4분음표
    stem2.textContent = "up";

    tied2.setAttribute("type", "stop"); // 끝 음표에 이음줄 종료
    slur.setAttribute("type", "stop"); // 슬러 (이음줄) 종료
    slur.setAttribute("placement", "above");

    pitch2.appendChild(step2);
    pitch2.appendChild(octave2);
    notations2.appendChild(tied2);
    notations2.appendChild(slur);

    note2.appendChild(pitch2);
    note2.appendChild(duration2);
    note2.appendChild(voice2);
    note2.appendChild(type2);
    note2.appendChild(stem2);
    note2.appendChild(notations2);

    // ✅ 이음줄(slur) 추가
    let slurElement = xmlDoc.createElement("notations");
    let slurNotation = xmlDoc.createElement("slur");
    slurNotation.setAttribute("type", "start"); // 슬러 시작
    slurNotation.setAttribute("placement", "above");
    slurElement.appendChild(slurNotation);

    note1.appendChild(slurElement); // 첫 번째 음표에 슬러 추가

    targetMeasure.appendChild(note1);
    targetMeasure.appendChild(note2);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '이음줄 추가 완료!'");
}
//✅잇단음표 추가
async function insertTripletWithNumber() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디 선택

    // ✅ Tuplet (잇단음표) 그룹 시작
    let tupletStart = xmlDoc.createElement("notations");
    let tupletStartElement = xmlDoc.createElement("tuplet");
    tupletStartElement.setAttribute("type", "start"); // 잇단음표 시작
    tupletStartElement.setAttribute("number", "1");
    tupletStart.appendChild(tupletStartElement);

    // ✅ 8분음표 3개 생성 (잇단음표)
    for (let i = 0; i < 3; i++) {
        let note = xmlDoc.createElement("note");
        let pitch = xmlDoc.createElement("pitch");
        let step = xmlDoc.createElement("step");
        let octave = xmlDoc.createElement("octave");
        let duration = xmlDoc.createElement("duration");
        let type = xmlDoc.createElement("type");
        let stem = xmlDoc.createElement("stem");
        let notations = xmlDoc.createElement("notations");
        let tuplet = xmlDoc.createElement("tuplet");

        step.textContent = ["C", "D", "E"][i]; // C, D, E 순으로 설정
        octave.textContent = "4"; // 옥타브 4
        duration.textContent = "1"; // 잇단음표 지속시간 조정
        type.textContent = "eighth"; // 8분음표
        stem.textContent = "up"; // 막대기 위쪽

        // ✅ 잇단음표 속성
        tuplet.setAttribute("type", i === 2 ? "stop" : "start");
        tuplet.setAttribute("number", "1");

        // ✅ 숫자 "3"을 표시하는 태그 추가
        let timeModification = xmlDoc.createElement("time-modification");
        let actualNotes = xmlDoc.createElement("actual-notes");
        let normalNotes = xmlDoc.createElement("normal-notes");

        actualNotes.textContent = "3"; // 잇단음표가 3개임을 표시
        normalNotes.textContent = "2"; // 일반적으로 2개 길이의 음표로 해석됨

        timeModification.appendChild(actualNotes);
        timeModification.appendChild(normalNotes);

        pitch.appendChild(step);
        pitch.appendChild(octave);
        notations.appendChild(tuplet);
        note.appendChild(pitch);
        note.appendChild(duration);
        note.appendChild(type);
        note.appendChild(stem);
        note.appendChild(notations);
        note.appendChild(timeModification); // 🎵 잇단음표 숫자 추가

        // ✅ 첫 번째 음표에만 잇단음표 시작 추가
        if (i === 0) {
            note.appendChild(tupletStart);
        }

        targetMeasure.appendChild(note);
    }

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '잇단음표(Triplet) + 숫자' 추가 완료!");
}
//✅붙임줄 추가
async function insertTie() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디에 추가

    // ✅ 불임줄을 포함한 음표 2개 추가
    let notes = [];
    for (let i = 0; i < 2; i++) {
        let note = xmlDoc.createElement("note");
        let pitch = xmlDoc.createElement("pitch");
        let step = xmlDoc.createElement("step");
        let octave = xmlDoc.createElement("octave");
        let duration = xmlDoc.createElement("duration");
        let type = xmlDoc.createElement("type");
        let tie = xmlDoc.createElement("tie");
        let notations = xmlDoc.createElement("notations");
        let tied = xmlDoc.createElement("tied");

        step.textContent = "C"; // C 음표
        octave.textContent = "4"; // 4옥타브
        duration.textContent = "1"; // 길이 설정 (4분음표)
        type.textContent = "quarter"; // 4분음표로 설정

        if (i === 0) {
            tie.setAttribute("type", "start"); // 첫 번째 음표에서 불임줄 시작
            tied.setAttribute("type", "start");
        } else {
            tie.setAttribute("type", "stop"); // 두 번째 음표에서 불임줄 종료
            tied.setAttribute("type", "stop");
        }

        pitch.appendChild(step);
        pitch.appendChild(octave);
        notations.appendChild(tied);
        note.appendChild(pitch);
        note.appendChild(duration);
        note.appendChild(type);
        note.appendChild(notations);
        note.appendChild(tie);

        notes.push(note);
    }

    // ✅ 음표를 마디에 추가
    targetMeasure.appendChild(notes[0]);
    targetMeasure.appendChild(notes[1]);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '불임줄 (Tie)' 추가 완료!");
}
//✅빔 연결
async function insertBeam() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디에 추가

    // ✅ 빔으로 연결할 8분 음표 2개 추가
    let notes = [];
    for (let i = 0; i < 2; i++) {
        let note = xmlDoc.createElement("note");
        let pitch = xmlDoc.createElement("pitch");
        let step = xmlDoc.createElement("step");
        let octave = xmlDoc.createElement("octave");
        let duration = xmlDoc.createElement("duration");
        let type = xmlDoc.createElement("type");
        let beam = xmlDoc.createElement("beam");

        step.textContent = "C"; // C 음표
        octave.textContent = "4"; // 4옥타브
        duration.textContent = "1"; // 길이 설정 (8분음표)
        type.textContent = "eighth"; // 8분음표로 설정

        if (i === 0) {
            beam.setAttribute("number", "1"); // 첫 번째 음표 - 빔 시작
            beam.textContent = "begin";
        } else {
            beam.setAttribute("number", "1"); // 두 번째 음표 - 빔 끝
            beam.textContent = "end";
        }

        pitch.appendChild(step);
        pitch.appendChild(octave);
        note.appendChild(pitch);
        note.appendChild(duration);
        note.appendChild(type);
        note.appendChild(beam);

        notes.push(note);
    }

    // ✅ 음표를 마디에 추가
    targetMeasure.appendChild(notes[0]);
    targetMeasure.appendChild(notes[1]);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '빔 연결' 추가 완료!");
}
//✅빔 연결 해제
async function removeBeam() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디를 가져오기

    // ✅ 빔을 포함한 음표 찾기
    let notes = targetMeasure.getElementsByTagName("note");
    for (let note of notes) {
        let beams = note.getElementsByTagName("beam");
        for (let beam of beams) {
            beam.textContent = "no"; // ✅ 빔 해제 (OSMD에서 'no' 설정 시 빔 제거됨)
        }
    }

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '빔 해제' 완료!");
}
//✅조옮김
async function transposeScore(interval) {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    // ✅ 음표를 찾아서 transposition 수행
    let notes = part.getElementsByTagName("note");
    for (let note of notes) {
        let pitch = note.getElementsByTagName("pitch")[0];
        if (pitch) {
            let step = pitch.getElementsByTagName("step")[0];
            let alter = pitch.getElementsByTagName("alter")[0];
            let octave = pitch.getElementsByTagName("octave")[0];

            // 음정 변환 (예: C → D, G → A)
            if (step) {
                let stepOrder = ["C", "D", "E", "F", "G", "A", "B"];
                let currentIndex = stepOrder.indexOf(step.textContent);
                let newIndex = (currentIndex + interval + 7) % 7;
                step.textContent = stepOrder[newIndex];
            }

            // 옥타브 조정
            if (octave) {
                let currentOctave = parseInt(octave.textContent);
                let newOctave = currentOctave + Math.floor(interval / 7);
                octave.textContent = newOctave.toString();
            }

            // 변음(#, ♭) 조정
            if (!alter) {
                alter = xmlDoc.createElement("alter");
                pitch.appendChild(alter);
            }
            alter.textContent = "0"; // 기본값 (♮)
        }
    }

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log(`🎵 '${interval}' 만큼 조옮김 완료!`);
}
//✅한 옥타브 높게/한 옥타브 낮게
async function insertOttava(type = "8va") {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 마지막 마디에 추가

    // ✅ 옥타브 표기 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let words = xmlDoc.createElement("words");

    words.textContent = type; // 🎼 '8va' 또는 '8vb' 표시
    words.setAttribute("font-weight", "bold"); // 굵게
    words.setAttribute("font-style", "italic"); // 기울이기

    directionType.appendChild(words);
    direction.appendChild(directionType);
    targetMeasure.insertBefore(direction, targetMeasure.firstChild);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log(`🎵 '${type}' 추가 완료!`);
}
//✅15ma  (두 옥타브 높게) 추가
async function insertQuindicesima() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 🎵 마지막 마디에 추가

    // ✅ 15ma(Quindicesima) 기호 추가 (OSMD에서 지원되지 않을 경우 강제로 텍스트 추가)
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let words = xmlDoc.createElement("words");

    words.textContent = "15ma"; // 🎵 악보에 표시할 텍스트
    words.setAttribute("font-weight", "bold"); // 🔥 굵게 표시
    words.setAttribute("font-style", "italic"); // 🎵 기울임꼴 적용
    words.setAttribute("font-size", "16"); // 🎵 글자 크기 조정

    directionType.appendChild(words);
    direction.appendChild(directionType);
    targetMeasure.insertBefore(direction, targetMeasure.firstChild);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '15ma(Quindicesima)' 기호 추가 완료!");
}
//✅15mb  (두 옥타브 낮게) 추가
async function insertQuindicesimaBassa() {
    if (!originalFileData) return;

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
    let part = xmlDoc.getElementsByTagName("part")[0];

    let measures = part.getElementsByTagName("measure");
    if (measures.length === 0) {
        console.warn("❌ 마디가 없습니다.");
        return;
    }

    let targetMeasure = measures[measures.length - 1]; // 🎵 마지막 마디에 추가

    // ✅ 15mb(Quindicesima bassa) 기호 추가
    let direction = xmlDoc.createElement("direction");
    let directionType = xmlDoc.createElement("direction-type");
    let words = xmlDoc.createElement("words");

    words.textContent = "15mb"; // 🎵 악보에 표시할 텍스트
    words.setAttribute("font-weight", "bold"); // 🔥 굵게 표시
    words.setAttribute("font-style", "italic"); // 🎵 기울임꼴 적용
    words.setAttribute("font-size", "16"); // 🎵 글자 크기 조정

    directionType.appendChild(words);
    direction.appendChild(directionType);
    targetMeasure.insertBefore(direction, targetMeasure.firstChild);

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    console.log("🎵 '15mb(Quindicesima bassa)' 기호 추가 완료!");
}





//고스트노트만 있는 악보
async function createGhostNoteScore() {
    const emptyScoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
    <part-list>
        <score-part id="P1">
            <part-name>Music</part-name>
        </score-part>
    </part-list>
    <part id="P1">
        <measure number="1">
            <attributes>
                <divisions>1</divisions>
                <key>
                    <fifths>0</fifths>
                </key>
                <time>
                    <beats>4</beats>
                    <beat-type>4</beat-type>
                </time>
                <clef>
                    <sign>G</sign>
                    <line>2</line>
                </clef>
            </attributes>
            <note>
                <pitch>
                    <step>C</step>
                    <octave>4</octave>
                </pitch>
                <duration>4</duration>
                <voice>1</voice>
                <type>quarter</type>
                <stem>up</stem>
                <notations>
                    <notehead parentheses="yes">normal</notehead>
                </notations>
            </note>
        </measure>
    </part>
</score-partwise>

    `;

    originalFileData = emptyScoreXML; // ✅ 원본 데이터 업데이트
    await osmd.load(originalFileData); 
    await osmd.render();

    // ✅ 빈 악보가 렌더링된 후 커서 초기화 및 표시
    osmd.cursor.show();
    osmd.cursor.reset();

    alert("🎵 악보 생성 완료!");
    console.log("🎵 악보 생성 완료!");
}
//1. 12,32,64분음표 기본적으로 있는 악보
// async function createEmptyScore() {
//     const emptyScoreXML = `<?xml version="1.0" encoding="UTF-8"?>
//     <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
//         "http://www.musicxml.org/dtds/partwise.dtd">
//     <score-partwise version="3.1">
//         <part-list>
//             <score-part id="P1">
//                 <part-name>Empty Score</part-name>
//             </score-part>
//         </part-list>
//         <part id="P1">
//             <measure number="1">
//                 <attributes>
//                     <divisions>16</divisions> 
//                     <key><fifths>0</fifths></key>
//                     <time>
//                         <beats>4</beats>
//                         <beat-type>4</beat-type>
//                     </time>
//                     <clef>
//                         <sign>G</sign>
//                         <line>2</line>
//                     </clef>
//                 </attributes>
                
//                 <!-- ✅ 온음표 -->
//                 <note>
//                     <pitch>
//                         <step>G</step>
//                         <octave>4</octave>
//                     </pitch>
//                     <duration>16</duration> <!-- 온음표는 divisions 값과 같음 -->
//                     <type>whole</type>
//                 </note>

//                 <!-- ✅ 2분음표 -->
//                 <note>
//                     <pitch>
//                         <step>E</step>
//                         <octave>4</octave>
//                     </pitch>
//                     <duration>8</duration> <!-- 2분음표 = divisions / 2 -->
//                     <type>half</type>
//                 </note>

//                 <!-- ✅ 4분음표 -->
//                 <note>
//                     <pitch>
//                         <step>D</step>
//                         <octave>4</octave>
//                     </pitch>
//                     <duration>4</duration> <!-- 4분음표 = divisions / 4 -->
//                     <type>quarter</type>
//                 </note>

//                 <!-- ✅ 8분음표 -->
//                 <note>
//                     <pitch>
//                         <step>C</step>
//                         <octave>4</octave>
//                     </pitch>
//                     <duration>2</duration> <!-- 8분음표 = divisions / 8 -->
//                     <type>eighth</type>
//                 </note>

//                 <!-- ✅ 16분음표 -->
//                 <note>
//                     <pitch>
//                         <step>B</step>
//                         <octave>3</octave>
//                     </pitch>
//                     <duration>1</duration> <!-- 16분음표 = divisions / 16 -->
//                     <type>sixteenth</type>
//                 </note>

//                 <!-- ✅ 32분음표 -->
//                 <note>
//                     <pitch>
//                         <step>A</step>
//                         <octave>3</octave>
//                     </pitch>
//                     <duration>0.5</duration> <!-- 32분음표 = divisions / 32 -->
//                     <type>thirty-second</type>
//                 </note>

//                 <!-- ✅ 64분음표 -->
//                 <note>
//                     <pitch>
//                         <step>G</step>
//                         <octave>3</octave>
//                     </pitch>
//                     <duration>0.25</duration> <!-- 64분음표 = divisions / 64 -->
//                     <type>sixty-fourth</type>
//                 </note>

//             </measure>
//         </part>
//     </score-partwise>
//     `;

//     originalFileData = emptyScoreXML;
//     await osmd.load(originalFileData);
//     await osmd.render();

//     // ✅ 커서 표시
//     osmd.cursor.show();
//     osmd.cursor.reset();

//     console.log("🎵 16분 음표 포함된 악보 생성 완료!");
// }

async function addMeasure() {
    if (!originalFileData) {
      console.error("❌ 악보 데이터가 없습니다.");
      return;
    }
  
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");
  
    let parts = xmlDoc.getElementsByTagName("part");
    if (parts.length === 0) {
      console.error("❌ part 요소를 찾을 수 없습니다.");
      return;
    }
  
    let part = parts[0]; // 첫 번째 파트만 사용
    let measures = part.getElementsByTagName("measure");
  
    let newMeasureNumber = measures.length + 1;
  
    let newMeasure = xmlDoc.createElement("measure");
    newMeasure.setAttribute("number", newMeasureNumber);
  
    let attributes = xmlDoc.createElement("attributes");
    attributes.innerHTML = `
      <divisions>1</divisions>
      <key><fifths>0</fifths></key>
      <time>
        <beats>4</beats>
        <beat-type>4</beat-type>
      </time>
      <clef>
        <sign>G</sign>
        <line>2</line>
      </clef>
    `;
  
    let note = xmlDoc.createElement("note");
    note.innerHTML = `
      <rest/>
      <duration>4</duration>
      <type>whole</type>
    `;
  
    newMeasure.appendChild(attributes);
    newMeasure.appendChild(note);
  
    // ✅ measures가 있으면 마지막 마디 다음에 추가, 없으면 part에 바로 추가
    if (measures.length > 0) {
      part.insertBefore(newMeasure, measures[measures.length - 1].nextSibling);
    } else {
      part.appendChild(newMeasure);
    }
  
    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);
  
    await osmd.load(originalFileData);
    await osmd.render();
  
    // 커서 초기화 및 표시
    osmd.cursor.show();
    osmd.cursor.reset();
  
    console.log("🎵 마디 추가 완료");
  }
  
async function removeLastMeasure() {
    if (!originalFileData) {
        console.error("원본 XML이 없습니다.");
        return;
    }

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(originalFileData, "text/xml");

    let part = xmlDoc.getElementsByTagName("part")[0];
    let measures = xmlDoc.getElementsByTagName("measure");

    if (measures.length <= 1) {
        console.warn("더 이상 마디를 삭제할 수 없습니다.");
        return;
    }

    part.removeChild(measures[measures.length - 1]); // 마지막 마디 삭제

    let serializer = new XMLSerializer();
    originalFileData = serializer.serializeToString(xmlDoc);

    await osmd.load(originalFileData);
    await osmd.render();

    // ✅ 삭제 후 마지막 마디에 커서 이동
    osmd.cursor.show();
    osmd.cursor.reset();
    for (let i = 0; i < measures.length - 2; i++) {
        osmd.cursor.next();
    }
}
