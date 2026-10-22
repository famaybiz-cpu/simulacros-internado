# -*- coding: utf-8 -*-
"""OCR de los PDF de fichas (imagenes muy altas) con Vision de macOS.
Uso: python3 ocrpdf.py <archivo.pdf> [salida.txt]
Trocea cada pagina en franjas con solape y las pasa por bin/ocrimg."""
import os, subprocess, sys, tempfile
import fitz

BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ocrimg")
ALTO = 1100.0      # puntos por franja
SOLAPE = 60.0      # puntos de solape para no cortar lineas
ESCALA = 2.2


def ocr_pdf(ruta):
    doc = fitz.open(ruta)
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, pg in enumerate(doc):
            out.append("===== PAGINA %d =====" % (i + 1))
            r = pg.rect
            y = r.y0
            n = 0
            trozos = []
            while y < r.y1 - 2:
                y2 = min(y + ALTO, r.y1)
                clip = fitz.Rect(r.x0, y, r.x1, y2)
                pix = pg.get_pixmap(matrix=fitz.Matrix(ESCALA, ESCALA), clip=clip)
                f = os.path.join(tmp, "p%02d_%03d.png" % (i, n))
                pix.save(f)
                trozos.append(f)
                n += 1
                y = y2 - SOLAPE if y2 < r.y1 else y2
            for f in trozos:
                t = subprocess.run([BIN, f], capture_output=True, text=True).stdout
                out.append(t.rstrip("\n"))
    # quitar lineas repetidas consecutivas (efecto del solape)
    limpio, prev = [], None
    for bloque in out:
        for ln in bloque.split("\n"):
            s = ln.strip()
            if s and s == prev:
                continue
            limpio.append(ln)
            prev = s
    return "\n".join(limpio)


if __name__ == "__main__":
    txt = ocr_pdf(sys.argv[1])
    if len(sys.argv) > 2:
        open(sys.argv[2], "w").write(txt)
        print("escrito:", sys.argv[2], len(txt), "caracteres")
    else:
        print(txt)
