//1. 직접 그리는 방식
// import 'dart:io';
// import 'package:flutter/material.dart';
// import 'package:file_picker/file_picker.dart';
// import 'package:xml/xml.dart' as xml;
// import 'package:piano/piano.dart';

// void main() {
//   runApp(const MyApp());
// }

// class MyApp extends StatelessWidget {
//   const MyApp({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(
//       debugShowCheckedModeBanner: false,
//       home: MusicXMLViewer(),
//     );
//   }
// }

// class MusicXMLViewer extends StatefulWidget {
//   @override
//   _MusicXMLViewerState createState() => _MusicXMLViewerState();
// }

// class _MusicXMLViewerState extends State<MusicXMLViewer> {
//   List<Map<String, dynamic>> _notes = [];

//   /// 🎼 MusicXML 파일 선택 및 파싱
//   Future<void> _pickAndParseMusicXML() async {
//     FilePickerResult? result = await FilePicker.platform.pickFiles(
//       type: FileType.any,
//     );

//     if (result != null) {
//       if (result.files.single.extension != 'musicxml') {
//         debugPrint("MusicXML 파일이 아닙니다.");
//         return;
//       }
//       File file = File(result.files.single.path!);
//       await _parseMusicXML(file);
//     }
//   }

//   /// 🎼 MusicXML 파일에서 음표 데이터 추출
//   Future<void> _parseMusicXML(File xmlFile) async {
//     try {
//       String xmlString = await xmlFile.readAsString();
//       final document = xml.XmlDocument.parse(xmlString);

//       List<Map<String, dynamic>> extractedNotes = [];
//       final measures = document.findAllElements('measure');

//       double screenWidth = MediaQuery.of(context).size.width;
//       double baseNoteSpacing = screenWidth * 0.07; // 반응형 음표 간격
//       double yPosition = 50; // 첫 마디 시작 위치
//       double measureSpacing = 270; // T + B 세트 간격 (여백 포함)
//       double xPosition = 0; // 첫 음표 위치

//       for (var measure in measures) {
//         final notes = measure.findAllElements('note');
//         bool isNewLine = measure.findElements('print').isNotEmpty;

//         if (isNewLine) {
//           yPosition += measureSpacing; // 줄 바꿈 (T + B 세트 기준)
//           xPosition = 50; // 새 줄에서 다시 시작
//         }

//         // 🎼 마디 구분선 추가 (T-B 오선 전체를 잇는 세로줄)
//         // extractedNotes.add({
//         //   'note': 'bar',
//         //   'x': xPosition - 10,
//         //   'yTreble': yPosition, // Treble 오선 위치
//         //   'yBass': yPosition + 90, // Bass 오선 위치 (여백 조정)
//         //   'clef': 'bar',
//         // });

//         for (var note in notes) {
//           var pitchElement = note.findElements('pitch').firstOrNull;
//           bool isRest = note.findElements('rest').isNotEmpty;
//           bool isChord = note.findElements('chord').isNotEmpty;

//           if (!isChord) {
//             xPosition += baseNoteSpacing; // 화음이 아닌 경우에만 x 증가
//           }

//           if (isRest) {
//             extractedNotes.add({
//               'note': 'rest',
//               'x': xPosition,
//               'y': yPosition + 30, // Treble 쉼표 위치
//               'clef': 'treble',
//             });
//           } else if (pitchElement != null) {
//             String step = pitchElement.findElements('step').first.text;
//             String octave = pitchElement.findElements('octave').first.text;
//             String noteName = "$step$octave";

//             bool isTreble = int.parse(octave) >= 4;
//             double yNote = _calculateNoteY(noteName, isTreble) +
//                 (isTreble ? yPosition : yPosition + 90); // B Clef 위치 조정

//             extractedNotes.add({
//               'note': noteName,
//               'x': xPosition,
//               'y': yNote,
//               'clef': isTreble ? 'treble' : 'bass',
//             });
//           }
//         }
//       }

//       setState(() {
//         _notes = extractedNotes;
//       });

//       debugPrint("추출된 음표 : $_notes");
//     } catch (e) {
//       debugPrint("MusicXML 파싱 오류: ${e.toString()}");
//     }
//   }

//   /// 🎼 음표 위치 계산 함수
//   double _calculateNoteY(String note, bool isTrebleClef) {
//     if (note == "rest") return isTrebleClef ? 80.0 : 100.0;

//     try {
//       int octave = int.parse(note.substring(1));
//       return isTrebleClef
//           ? -20.0 * (octave - 4).toDouble()
//           : 20.0 * (3 - octave).toDouble();
//     } catch (e) {
//       debugPrint("음표 파싱 오류: ${e.toString()} (입력: $note)");
//       return 0.0;
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(title: const Text("MusicXML → 악보 & 피아노 연동")),
//       body: Column(
//         children: [
//           ElevatedButton(
//             onPressed: _pickAndParseMusicXML,
//             child: const Text("MusicXML 파일 선택"),
//           ),
//           // const SizedBox(height: 50),
//           Expanded(
//             child: _notes.isEmpty
//                 ? Center(
//                     child: Text(
//                       "🎼 악보를 업로드 해 주세요 🎼",
//                       style: TextStyle(fontSize: 16),
//                     ),
//                   )
//                 : SingleChildScrollView(
//                     scrollDirection: Axis.vertical,
//                     child: CustomPaint(
//                       size: Size(MediaQuery.of(context).size.width, 3000),
//                       painter: SheetMusicPainter(_notes),
//                     ),
//                   ),
//           ),
//           SizedBox(height: 20),
//           Container(
//             height: 200,
//             child: InteractivePiano(
//               keyWidth: 50,
//               noteRange: NoteRange.forClefs([Clef.Treble]),
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }

// class SheetMusicPainter extends CustomPainter {
//   final List<Map<String, dynamic>> notes;

//   SheetMusicPainter(this.notes);

//   @override
//   void paint(Canvas canvas, Size size) {
//     final paint = Paint()
//       ..color = Colors.black
//       ..strokeWidth = 2.0;
//     final textPainter = TextPainter(textDirection: TextDirection.ltr);
// //악보 그리는 거
//     for (double y = 50; y < size.height; y += 270) {
//       for (int i = 0; i < 5; i++) {
//         canvas.drawLine(Offset(20, y + (i * 15)),
//             Offset(size.width - 20, y + (i * 15)), paint);
//         canvas.drawLine(Offset(20, y + 90 + (i * 15)),
//             Offset(size.width - 20, y + 90 + (i * 15)), paint);
//       }

//       textPainter.text = TextSpan(
//           text: "T", style: TextStyle(color: Colors.black, fontSize: 16));
//       textPainter.layout();
//       textPainter.paint(canvas, Offset(5, y + 30));

//       textPainter.text = TextSpan(
//           text: "B", style: TextStyle(color: Colors.black, fontSize: 16));
//       textPainter.layout();
//       textPainter.paint(canvas, Offset(5, y + 120));
//     }
// //음표 그리는거
//     for (var note in notes) {
//       double y = note['y'];
//       textPainter.text = TextSpan(
//           text: "${note['note']} / ${note['clef'].toString().substring(0, 1)}",
//           style: TextStyle(color: Colors.black, fontSize: 10));
//       textPainter.layout();
//       textPainter.paint(canvas, Offset(note['x'] - 8, y - 15));

//       canvas.drawCircle(Offset(note['x'], y), 5, paint);
//     }
//   }

//   @override
//   bool shouldRepaint(SheetMusicPainter oldDelegate) => true;
// }
//2. 웹뷰로 띄우는 방식
// import 'dart:convert';
// import 'dart:io';
// import 'package:flutter/material.dart';
// import 'package:webview_flutter/webview_flutter.dart';
// import 'package:file_picker/file_picker.dart';
// import 'package:piano/piano.dart'; // ✅ 피아노 라이브러리 추가

// void main() {
//   runApp(const MyApp());
// }

// class MyApp extends StatelessWidget {
//   const MyApp({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(
//       debugShowCheckedModeBanner: false,
//       home: MusicXMLViewer(),
//     );
//   }
// }

// class MusicXMLViewer extends StatefulWidget {
//   @override
//   _MusicXMLViewerState createState() => _MusicXMLViewerState();
// }

// class _MusicXMLViewerState extends State<MusicXMLViewer> {
//   late final WebViewController _controller;
//   String? _selectedNote; // ✅ 선택된 악보 음표

//   @override
//   void initState() {
//     super.initState();

//     _controller = WebViewController()
//       ..setJavaScriptMode(JavaScriptMode.unrestricted)
//       ..setNavigationDelegate(
//         NavigationDelegate(
//           onProgress: (int progress) {},
//           onPageStarted: (String url) {},
//           onPageFinished: (String url) {},
//           onHttpError: (HttpResponseError error) {},
//           onWebResourceError: (WebResourceError error) {},
//           onNavigationRequest: (NavigationRequest request) {
//             return NavigationDecision.navigate;
//           },
//         ),
//       )
//       ..addJavaScriptChannel(
//         'Flutter',
//         onMessageReceived: (JavaScriptMessage message) {
//           if (message.message.startsWith("noteClicked:")) {
//             String noteName = message.message.replaceFirst("noteClicked:", "");
//             setState(() {
//               _selectedNote = noteName; // ✅ 선택된 음표 저장
//             });
//             print("🎵 선택된 악보 음표: $_selectedNote");
//           } else if (message.message == "pickFile") {
//             _pickMusicXMLFile();
//           }
//         },
//       )
//       ..loadRequest(Uri.parse(
//           'file:///android_asset/flutter_assets/assets/osmd_viewer.html'));
//   }

//   /// ✅ **파일 선택 후 Base64로 변환하여 WebView에 전달**
//   Future<void> _pickMusicXMLFile() async {
//     FilePickerResult? result = await FilePicker.platform.pickFiles(
//       type: FileType.any,
//     );

//     if (result != null) {
//       File file = File(result.files.single.path!);
//       String base64String = base64Encode(await file.readAsBytes());

//       _controller.runJavaScript(
//           'loadMusicXML("data:application/xml;base64,$base64String");');
//     }
//   }

//   /// ✅ **건반을 클릭하면 선택된 음표를 새로운 음으로 교체**
//   void _onPianoKeyPressed(String newNote) {
//     if (_selectedNote != null) {
//       print("🎹 건반 누름: $newNote, 기존 선택된 음표: $_selectedNote");

//       // ✅ WebView(악보)에서 해당 음표를 교체
//       _controller
//           .runJavaScript('replaceNoteInSheet("${_selectedNote}", "$newNote");');

//       // ✅ 선택된 음표 초기화
//       setState(() {
//         _selectedNote = null;
//       });

//       ScaffoldMessenger.of(context).showSnackBar(
//         SnackBar(content: Text("음표 변경됨: $newNote")),
//       );
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(title: const Text("MusicXML Viewer")),
//       body: Column(
//         children: [
//           Expanded(child: WebViewWidget(controller: _controller)), // 🎼 악보
//           Expanded(
//             child: Container(
//               width: double.infinity,
//               color: Colors.black12,
//               child: InteractivePiano(
//                 noteRange: NoteRange.forClefs([Clef.Treble, Clef.Bass]),
//                 onNotePositionTapped: (note) {
//                   String noteStr = note.toString();
//                   _onPianoKeyPressed(noteStr); // ✅ 건반 클릭 시 음 변경
//                 },
//                 keyWidth: 40,
//               ),
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }
// 3.웹뷰로 띄우는 방식->flutter_inappwebview
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:piano/piano.dart';
import 'package:sheet_music_edit_testapp/img_loader.dart';

void main() {
  runApp(const OSMDScreen());
}

class OSMDScreen extends StatefulWidget {
  const OSMDScreen({super.key});

  @override
  State<OSMDScreen> createState() => _OSMDScreenState();
}

class _OSMDScreenState extends State<OSMDScreen> {
  InAppLocalhostServer localhostServer =
      InAppLocalhostServer(documentRoot: 'assets/web');

  late String fileString;
  InAppWebViewController? webViewController;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    startLocalhost();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
      SystemChannels.textInput.invokeMethod('TextInput.show');
    });
  }

  startLocalhost() async {
    fileString = await rootBundle.loadString('assets/music/demo.musicxml');
    await localhostServer.start();
    setState(() {});
  }

  @override
  void dispose() {
    localhostServer.close();
    _focusNode.dispose();
    super.dispose();
  }

  // ✅ 음표 목록
  final List<Map<String, String>> notes = [
    {"name": "온음표", "value": "whole"},
    {"name": "2분음표", "value": "half"},
    {"name": "4분음표", "value": "quarter"},
    {"name": "8분음표", "value": "eighth"},
    {"name": "16분음표", "value": "sixteenth"},
    {"name": "32분음표", "value": "thirty-second"},
    {"name": "64분음표", "value": "sixty-fourth"},
  ];

  // ✅ 음표 타입별 duration 매핑
  final Map<String, int> durationMap = {
    "whole": 4,
    "half": 2,
    "quarter": 1,
    // "eighth": 0.5.toInt(),
    // "sixteenth": 0.25.toInt(),
    // "thirty-second": 0.125.toInt(),
    // "sixty-fourth": 0.0625.toInt(),
    "eighth": 0.5.toInt(),
    "sixteenth": 1.toInt(),
    "thirty-second": 8.toInt(),
    "sixty-fourth": 4.toInt(),
  };
// ✅ 추가할 기호 목록
  final List<Map<String, dynamic>> accidentals = [
    {"name": "없음", "value": null},
    {"name": "점음표", "value": "dot"},
    {"name": "샵(#)", "value": 1},
    {"name": "더블샵(𝄪)", "value": 2},
    {"name": "플랫(b)", "value": -1},
    {"name": "더블플랫(𝄫)", "value": -2},
    {"name": "내추럴(♮)", "value": 0},
  ];
// ✅ 기호 목록
  final List<Map<String, String>> articulations = [
    {"name": "없음", "value": ""},
    {"name": "스타카토", "value": "staccato"},
    {"name": "스타카티시모", "value": "staccatissimo"},
    {"name": "테누토", "value": "tenuto"},
    {"name": "페르마타", "value": "fermata"},
    {"name": "마르카토", "value": "marcato"},
    {"name": "악센트", "value": "accent"},
    {"name": "숨표", "value": "breath-mark"},
    {"name": "카에수라", "value": "caesura"},
    {"name": "아치아카투라", "value": "appoggiatura"},
    {"name": "꾸밈음", "value": "grace-note"},
  ];

  String? selectedArticulation = ""; // ✅ 기본값: 없음

  dynamic selectedAccidental = null; // 기본값: 없음
  String? selectedNote = "whole"; // ✅ 기본값: 온음표 선택됨
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: SafeArea(
        child: Scaffold(
          // appBar: AppBar(title: const Text("WebView + Piano Keyboard")),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (localhostServer.isRunning())
                Expanded(
                  flex: 2,
                  child: InAppWebView(
                    initialUrlRequest: URLRequest(
                      url: WebUri('http://localhost:8080'),
                    ),
                    onWebViewCreated: (controller) {
                      webViewController = controller;
                      controller.addJavaScriptHandler(
                        handlerName: 'sendFileToOSMD',
                        callback: (args) async {
                          return {'bytes': fileString};
                        },
                      );
                      controller.addJavaScriptHandler(
                        handlerName: 'getLocalImagePath',
                        callback: (args) async {
                          String base64Image =
                              await ImageLoader.getBase64GhostNote();
                          return "data:image/svg+xml;base64,$base64Image"; // ✅ Base64 인코딩된 이미지 경로 반환
                        },
                      );
                      controller.addJavaScriptHandler(
                        handlerName: 'getLocalGlissandoImagePath',
                        callback: (args) async {
                          String base64Image =
                              await ImageLoader.getBase64GhostNote();
                          return "data:image/svg+xml;base64,$base64Image"; // ✅ Base64 인코딩된 이미지 경로 반환
                        },
                      );
                      controller.addJavaScriptHandler(
                        handlerName: 'getLocalTremoloImagePath',
                        callback: (args) async {
                          String base64Image =
                              await ImageLoader.getBase64GhostNote();
                          return "data:image/svg+xml;base64,$base64Image"; // ✅ Base64 인코딩된 이미지 반환
                        },
                      );
                    },
                  ),
                ),
              const SizedBox(height: 10),
              // ✅커서 움직이는 것 & 빈 악보 생성
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () {
                      webViewController?.evaluateJavascript(
                          source: 'moveCursor("left");');
                    },
                    child:
                        const Text("왼쪽", style: TextStyle(color: Colors.white)),
                  ),
                  const SizedBox(width: 30),
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () {
                      webViewController?.evaluateJavascript(
                          source: 'moveCursor("right");');
                    },
                    child: const Text("오른쪽",
                        style: TextStyle(color: Colors.white)),
                  ),
                  const SizedBox(width: 30),
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.cyan),
                    onPressed: () async {
                      // ✅ async 추가!
                      await webViewController?.evaluateJavascript(
                          // ✅ await 추가!
                          source: 'createEmptyScore();');
                    },
                    child: const Text("빈 악보 생성",
                        style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),

              // ✅마디 삭제 & 생성
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.black),
                    onPressed: () async {
                      // ✅ async 추가!
                      await webViewController?.evaluateJavascript(
                          // ✅ await 추가!
                          source: 'removeLastMeasure();');
                    },
                    child: const Text("마디 삭제",
                        style: TextStyle(color: Colors.white)),
                  ),
                  const SizedBox(width: 30),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange),
                    onPressed: () async {
                      // ✅ async 추가!
                      await webViewController?.evaluateJavascript(
                          // ✅ await 추가!
                          source: 'addMeasure();');
                    },
                    child: const Text("마디 추가",
                        style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
              // ✅점 4분음표 1개 & 2개 추가
              // Row(
              //   mainAxisAlignment: MainAxisAlignment.center,
              //   children: [
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () {
              //         webViewController?.evaluateJavascript(
              //             source: 'addDottedQuarterNote();');
              //       },
              //       child: const Text("점 4분음표(1) 추가",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     const SizedBox(width: 30),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () {
              //         webViewController?.evaluateJavascript(
              //             source: 'addDoubleDottedQuarterNote();');
              //       },
              //       child: const Text("점 4분음표(2) 추가",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              // ✅온음표~내추럴 추가
              // Row(children: [
              //   DropdownButton<String>(
              //     hint: const Text("음표 선택"),
              //     value: selectedNote,
              //     onChanged: (String? newValue) {
              //       setState(() {
              //         selectedNote = newValue;
              //       });
              //     },
              //     items: notes.map<DropdownMenuItem<String>>((note) {
              //       return DropdownMenuItem<String>(
              //         value: note["value"],
              //         child: Text(note["name"]!), // ✅ 음표 이름 표시
              //       );
              //     }).toList(),
              //   ),
              //   // UI 추가
              //   DropdownButton<dynamic>(
              //     hint: const Text("기호 선택"),
              //     value: selectedAccidental,
              //     onChanged: (dynamic newValue) {
              //       setState(() {
              //         selectedAccidental = newValue;
              //       });
              //     },
              //     items: accidentals.map<DropdownMenuItem<dynamic>>((acc) {
              //       return DropdownMenuItem<dynamic>(
              //         value: acc["value"],
              //         child: Text(acc["name"]!),
              //       );
              //     }).toList(),
              //   ),
              // ]),
              // ✅스타카토~꾸밈음
              // Row(
              //   children: [
              //     // 🎶 드롭다운 UI
              //     DropdownButton<String>(
              //       hint: const Text("기호 선택"),
              //       value: selectedArticulation,
              //       onChanged: (String? newValue) {
              //         setState(() {
              //           selectedArticulation = newValue;
              //         });
              //       },
              //       items: articulations
              //           .map<DropdownMenuItem<String>>((articulation) {
              //         return DropdownMenuItem<String>(
              //           value: articulation["value"],
              //           child: Text(articulation["name"]!),
              //         );
              //       }).toList(),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         if (selectedArticulation != null) {
              //           await webViewController?.evaluateJavascript(
              //             source:
              //                 'insertNoteWithArticulation("C", 4, "$selectedArticulation");',
              //           );
              //         }
              //       },
              //       child:
              //           const Text("적용", style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
//✅고스트 노트 ,데드노트 ,아르페지오
              // Row(
              //   children: [
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertGhostNoteImage();');
              //       },
              //       child: const Text("고스트 노트",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDeadNote();');
              //       },
              //       child: const Text("데드 노트",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertArpeggioNote();');
              //       },
              //       child: const Text("아르페지오",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertArpeggioNote();');
              //       },
              //       child: const Text("아르페지오",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              //✅글리산도,트레몰로,트레몰로 빔
              // Row(
              //   children: [
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'addTwoNotesWithGlissando();');
              //       },
              //       child: const Text("글리산도",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertTremoloNote();');
              //       },
              //       child: const Text("트레몰로",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertTremoloBeam();');
              //       },
              //       child: const Text("트레몰로 빔",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              // ✅트릴,  턴, 모르덴트
              // Row(
              //   children: [
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertTrillNote();');
              //       },
              //       child:
              //           const Text("트릴", style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertTurnNote();');
              //       },
              //       child:
              //           const Text("턴", style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertMordentNote();');
              //       },
              //       child: const Text("모르덴트",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              //✅크레센도,디크레센도,피아노ppp
              // Row(
              //   children: [
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertCrescendo();');
              //       },
              //       child: const Text("크레센도",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDecrescendo();');
              //       },
              //       child: const Text("디크레센도",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicPPP();');
              //       },
              //       child: const Text("피아노 ppp",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              //✅피아니시모pp, 피아니시시모p, 메조피아노mp
              // Row(
              //   children: [
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicPP();');
              //       },
              //       child: const Text("피아니시모pp",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicP();');
              //       },
              //       child: const Text("피아니시시모p",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 20,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicMP();');
              //       },
              //       child: const Text("메조피아노mp",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              //✅메조피아노mf~페달 해제
              // Wrap(
              //   children: [
              // SizedBox(
              //   width: 30,
              // ),
              // ElevatedButton(
              //   style:
              //       ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //   onPressed: () async {
              //     // ✅ async 추가!
              //     await webViewController?.evaluateJavascript(
              //         // ✅ await 추가!
              //         source: 'insertDynamicMF();');
              //   },
              //   child: const Text("메조피아노mf",
              //       style: TextStyle(color: Colors.white)),
              // ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicForte();');
              //       },
              //       child: const Text("포르테f",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicFortissimo();');
              //       },
              //       child: const Text("포르티시모ff",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicFortississimo();');
              //       },
              //       child: const Text("포르테시시모fff",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicSforzando();');
              //       },
              //       child: const Text("스포르찬도sfz",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicRinforzando();');
              //       },
              //       child: const Text("린포르찬도rfz",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicFortePiano();');
              //       },
              //       child: const Text("포르테피아노 (fp)",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDynamicPianoForte();');
              //       },
              //       child: const Text("피아노포르테 (pf)",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertStyledPedalText();');
              //       },
              //       child:
              //           const Text("페달", style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertPedalReleaseText();');
              //       },
              //       child: const Text("페달 해제",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              //✅Bar Line~왼쪽 도돌이표
              // Wrap(
              //   children: [
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertBarLine();');
              //       },
              //       child: const Text("Bar Line",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDoubleBarLine();');
              //       },
              //       child: const Text("Double Bar Line",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertRepeatBarLine("forward");');
              //       },
              //       child: const Text("반복 시작 마디줄",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertRepeatBarLine("backward");');
              //       },
              //       child: const Text("반복 끝 마디줄",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertRepeatBarLineForward();');
              //       },
              //       child: const Text("오른쪽 도돌이표",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertRepeatBarLineBackward();');
              //       },
              //       child: const Text("왼쪽 도돌이표",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              //✅Coda~D.C.다 카포
              // Wrap(
              //   children: [
              // SizedBox(
              //   width: 30,
              // ),
              // ElevatedButton(
              //   style:
              //       ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //   onPressed: () async {
              //     // ✅ async 추가!
              //     await webViewController?.evaluateJavascript(
              //         // ✅ await 추가!
              //         source: 'insertCodaSymbol();');
              //   },
              //   child: const Text("Coda",
              //       style: TextStyle(color: Colors.white)),
              // ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertSegnoSymbol();');
              //       },
              //       child:
              //           const Text("세뇨", style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertFineSymbol();');
              //       },
              //       child: const Text("Fine.",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertToCodaSymbol();');
              //       },
              //       child: const Text("To Coda",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDalSegnoWithText();');
              //       },
              //       child: const Text("D.S.달세뇨",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertDaCapo();');
              //       },
              //       child: const Text("D.C.다 카포",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              //✅엔딩~꾸밈음
              // Wrap(
              //   children: [
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertEnding();');
              //       },
              //       child:
              //           const Text("엔딩", style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertRitardando();');
              //       },
              //       child: const Text("리타르단도",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertAccelerando();');
              //       },
              //       child: const Text("아첼레란도",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertMarcatoWithImage();');
              //       },
              //       child: const Text("마르카토",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertAccent();');
              //       },
              //       child: const Text("악센트",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertBreathMark();');
              //       },
              //       child:
              //           const Text("숨표", style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertNoteWithCaesura();');
              //       },
              //       child: const Text("카에수라",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertGgumimNote();');
              //       },
              //       child: const Text("꾸밈음",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'createAcciaccaturaScore();');
              //       },
              //       child: const Text("아치아카투라음표만 있는 악보 생성",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'createGracenoteScore();');
              //       },
              //       child: const Text("꾸밈음음표만 있는 악보 생성",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              // SizedBox(
              //   width: 30,
              // ),
              // ElevatedButton(
              //   style:
              //       ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //   onPressed: () async {
              //     // ✅ async 추가!
              //     await webViewController?.evaluateJavascript(
              //         // ✅ await 추가!
              //         source: 'createGracenoteScore();');
              //   },
              //   child: const Text("고스트노트만 있는 악보 생성",
              //       style: TextStyle(color: Colors.white)),
              // ),
              //   ],
              // ),
              //✅고스트 노트 ,데드노트 ,아르페지오
              // Wrap(
              //   children: [
              // SizedBox(
              //   width: 30,
              // ),
              // ElevatedButton(
              //   style:
              //       ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //   onPressed: () async {
              //     // ✅ async 추가!
              //     await webViewController?.evaluateJavascript(
              //         // ✅ await 추가!
              //         source: 'createGhostNoteScore();');
              //   },
              //   child: const Text("고스트노트만 있는 악보 생성",
              //       style: TextStyle(color: Colors.white)),
              // ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertGhostNoteTest();');
              //       },
              //       child: const Text("고스트노트",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertSlurNotes();');
              //       },
              //       child: const Text("이음줄",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertTripletWithNumber();');
              //       },
              //       child: const Text("잇단음표",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertTie();');
              //       },
              //       child: const Text("붙임줄",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'insertBeam();');
              //       },
              //       child: const Text("빔 연결",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'removeBeam();');
              //       },
              //       child: const Text("빔 연결 해제",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //     SizedBox(
              //       width: 30,
              //     ),
              //     ElevatedButton(
              //       style:
              //           ElevatedButton.styleFrom(backgroundColor: Colors.green),
              //       onPressed: () async {
              //         // ✅ async 추가!
              //         await webViewController?.evaluateJavascript(
              //             // ✅ await 추가!
              //             source: 'transposeScore(2);');
              //       },
              //       child: const Text("조 옮김",
              //           style: TextStyle(color: Colors.white)),
              //     ),
              //   ],
              // ),
              Wrap(
                children: [
                  SizedBox(
                    width: 30,
                  ),
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () async {
                      // ✅ async 추가!
                      await webViewController?.evaluateJavascript(
                          // ✅ await 추가!
                          source: 'insertOttava("8va");');
                    },
                    child: const Text("8va",
                        style: TextStyle(color: Colors.white)),
                  ),
                  SizedBox(
                    width: 30,
                  ),
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () async {
                      // ✅ async 추가!
                      await webViewController?.evaluateJavascript(
                          // ✅ await 추가!
                          source: 'insertOttava("8vb");');
                    },
                    child: const Text("8vb",
                        style: TextStyle(color: Colors.white)),
                  ),
                  SizedBox(
                    width: 30,
                  ),
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () async {
                      // ✅ async 추가!
                      await webViewController?.evaluateJavascript(
                          // ✅ await 추가!
                          source: 'insertQuindicesima();');
                    },
                    child: const Text("15ma",
                        style: TextStyle(color: Colors.white)),
                  ),
                  SizedBox(
                    width: 30,
                  ),
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () async {
                      // ✅ async 추가!
                      await webViewController?.evaluateJavascript(
                          // ✅ await 추가!
                          source: 'insertQuindicesimaBassa();');
                    },
                    child: const Text("15mb",
                        style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
              Expanded(
                flex: 1,
                child: InteractivePiano(
                  noteRange: NoteRange.forClefs([Clef.Treble, Clef.Bass]),
                  keyWidth: 40,
                  naturalColor: Colors.white,
                  accidentalColor: Colors.black,
                  onNotePositionTapped: (note) {
                    // ✅ 드롭다운에서 선택한 음표 반영
                    final noteType = selectedNote ?? "whole";
                    final duration = durationMap[noteType] ?? 4; // 기본값: 온음표 (4)
                    final accidentalValue =
                        selectedAccidental ?? "null"; // 조표 값
                    webViewController?.evaluateJavascript(
                      source:
                          // 'insertNoteAtCursor("${note.name.substring(0, 1)}", ${note.octave});',
                          'insertNoteAtCursor("${note.name.substring(0, 1)}", ${note.octave}, "$noteType", $duration, $accidentalValue);',
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
