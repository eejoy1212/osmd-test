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
//고스트 노트를 삽입하기 위한 커서 위치
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
//✅ 이미지로 삽입하는 방법
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




//1. 아무것도 없는 악보 생성
async function createEmptyScore() {
    const emptyScoreXML = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
        "http://www.musicxml.org/dtds/partwise.dtd">
    <score-partwise version="3.1">
        <part-list>
            <score-part id="P1">
                <part-name>Empty Score</part-name>
            </score-part>
        </part-list>
        <part id="P1">
            <measure number="1">
                <attributes>
                    <divisions>16</divisions> <!-- ✅ divisions을 16으로 설정 -->
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

                <!-- ✅ 온음표 (쉼표) -->
                <note>
                    <rest/>
                    <duration>4</duration>
                    <type>whole</type>
                </note>

                <!-- ✅ 점 4분음표 + 마르카토 -->
                <note>
                    <pitch>
                        <step>C</step>
                        <octave>4</octave>
                    </pitch>
                    <duration>3</duration> <!-- 기존 duration의 1.5배 -->
                    <type>quarter</type>
                    <dot/> <!-- 점음표 -->

                    <!-- ✅ 마르카토 적용 -->
                    <notations>
                        <articulations>
                            <marcato/>
                        </articulations>
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

    alert("🎵 마르카토 포함된 악보 생성 완료!");
    console.log("🎵 마르카토 포함된 악보 생성 완료!");
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
