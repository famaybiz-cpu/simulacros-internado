// OCR de imagenes con Vision (macOS). Uso: ocrimg <img1> [img2 ...]
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("no se pudo leer \(path)\n".data(using:.utf8)!); continue }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    req.recognitionLanguages = ["es-ES", "en-US"]
    do { try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req]) }
    catch { FileHandle.standardError.write("fallo OCR en \(path)\n".data(using:.utf8)!); continue }
    var lineas: [(CGFloat, CGFloat, String)] = []
    for obs in (req.results ?? []) {
        guard let c = obs.topCandidates(1).first else { continue }
        lineas.append((obs.boundingBox.midY, obs.boundingBox.minX, c.string))
    }
    lineas.sort { a, b in abs(a.0 - b.0) < 0.004 ? a.1 < b.1 : a.0 > b.0 }
    for l in lineas { print(l.2) }
}
