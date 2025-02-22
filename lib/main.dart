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

void main() {
  runApp(const OSMDScreen());
}

class OSMDScreen extends StatefulWidget {
  const OSMDScreen({
    super.key,
  });

  @override
  State<OSMDScreen> createState() => _OSMDScreenState();
}

class _OSMDScreenState extends State<OSMDScreen> {
  InAppLocalhostServer localhostServer =
      InAppLocalhostServer(documentRoot: 'assets/web');

  late String fileString;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    startLocalhost();
  }

  startLocalhost() async {
    // 파일 로드
    fileString = await rootBundle.loadString('assets/music/demo.musicxml');
    // 로컬호스트 시작
    await localhostServer.start();
    setState(() {});
  }

  @override
  void dispose() {
    // 위젯이 dispose되기 전에 localhost를 종료해야 한다.
    localhostServer.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text("webview로 OSMD 사용하기 예제")),
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (localhostServer.isRunning())
              Expanded(
                child: SizedBox.expand(
                  child: InAppWebView(
                    initialUrlRequest: URLRequest(
                      url: WebUri('http://localhost:8080'),
                    ),
                    onWebViewCreated: (controller) async {
                      controller.addJavaScriptHandler(
                          handlerName: 'sendFileToOSMD',
                          callback: (args) async {
                            return {
                              'bytes': fileString,
                            };
                          });
                    },
                  ),
                ),
              )
          ],
        ),
      ),
    );
  }
}
