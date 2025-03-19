import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;

class ImageLoader {
  static Future<String> getBase64GhostNote() async {
    final ByteData bytes =
        await rootBundle.load('assets/images/ghost-note.svg');
    final Uint8List byteList = bytes.buffer.asUint8List();
    return base64Encode(byteList);
  }
}
