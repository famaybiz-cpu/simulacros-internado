"""QC estricto: ninguna columna puede recortar texto (hueco<0) ni dejar demasiado aire (>12%)."""
import sys, os
from playwright.sync_api import sync_playwright

MAX_HUECO = 12.0
html = sys.argv[1]; BASE = os.path.dirname(os.path.abspath(__file__))

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    pg = b.new_page(); pg.goto(f"file://{BASE}/{html}")
    data = pg.evaluate("""() => { const out=[];
      document.querySelectorAll('.card').forEach((card,ci)=>{ const cols=[];
        card.querySelectorAll('.col').forEach(col=>{ const ch=col.clientHeight; const k=col.children;
          let used=0; if(k.length){ const t=col.getBoundingClientRect().top;
            used=k[k.length-1].getBoundingClientRect().bottom-t; }
          cols.push({pct:Math.round((ch-used)/ch*1000)/10}); });
        out.push({card:ci+1,cols,oY:Math.round(card.scrollHeight-card.clientHeight)}); }); return out; }""")
    b.close()

fallas = []
for d in data:
    print(f"Card {d['card']}: overflowY={d['oY']} | " +
          " · ".join(f"col{i+1} {c['pct']:+.1f}%" for i, c in enumerate(d['cols'])))
    if d['oY'] > 0: fallas.append(f"card {d['card']}: la hoja desborda {d['oY']}px")
    for i, c in enumerate(d['cols']):
        if c['pct'] < 0: fallas.append(f"card {d['card']} col{i+1}: RECORTA ({c['pct']}%)")
        elif c['pct'] > MAX_HUECO: fallas.append(f"card {d['card']} col{i+1}: sobra ({c['pct']}%)")

print("\n" + ("OK" if not fallas else "FALLA:\n  - " + "\n  - ".join(fallas)))
sys.exit(0 if not fallas else 1)
