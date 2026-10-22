// OCR de PDF con Vision (macOS). Uso: ocrpdf <archivo.pdf> [escala]
import Foundation
import Vision
import Quartz
import AppKit

let args = CommandLine.arguments
guard args.count > 1 else { FileHandle.standardError.write("uso: ocrpdf <pdf> [escala]\n".data(using:.utf8)!); exit(2) }
let url = URL(fileURLWithPath: args[1])
let escala: CGFloat = args.count > 2 ? CGFloat(Double(args[2]) ?? 3.0) : 3.0
guard let doc = PDFDocument(url: url) else { FileHandle.standardError.write("no se pudo abrir el PDF\n".data(using:.utf8)!); exit(1) }

for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let r = page.bounds(for: .mediaBox)
    let w = Int(r.width * escala), h = Int(r.height * escala)
    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { continue }
    ctx.setFillColor(CGColor(gray: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.scaleBy(x: escala, y: escala)
    ctx.translateBy(x: -r.origin.x, y: -r.origin.y)
    page.draw(with: .mediaBox, to: ctx)
    guard let img = ctx.makeImage() else { continue }

    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    req.recognitionLanguages = ["es-ES", "en-US"]
    let handler = VNImageRequestHandler(cgImage: img, options: [:])
    do { try handler.perform([req]) } catch { continue }
    var lineas: [(CGFloat, CGFloat, String)] = []
    for obs in (req.results ?? []) {
        guard let c = obs.topCandidates(1).first else { continue }
        lineas.append((obs.boundingBox.midY, obs.boundingBox.minX, c.string))
    }
    // ordenar por filas (de arriba a abajo) y dentro de la fila por columna
    lineas.sort { a, b in abs(a.0 - b.0) < 0.006 ? a.1 < b.1 : a.0 > b.0 }
    print("===== PAGINA \(i+1) =====")
    for l in lineas { print(l.2) }
}
