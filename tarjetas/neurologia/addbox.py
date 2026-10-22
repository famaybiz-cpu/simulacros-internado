import sys, io, re
# uso: python3 addbox.py ARCHIVO.html CARD(1|2) COL(1|2|3)  < fragmento.html
f, card, col = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
frag = sys.stdin.read().rstrip("\n")
L = io.open(f, encoding="utf-8").read().split("\n")
# limites de tarjeta
starts = [i for i,l in enumerate(L) if l.strip().startswith('<div class="card card')]
a = starts[card-1]
b = starts[card] if card < len(starts) else len(L)
# inicio de columna
ci = next(i for i in range(a,b) if L[i].strip() == '<div class="col c%d">' % col)
# cierre de columna = primera linea '    </div>' despues
cj = next(i for i in range(ci+1,b) if L[i] == '    </div>')
L[cj:cj] = ["" ] + frag.split("\n")
io.open(f,"w",encoding="utf-8").write("\n".join(L))
print("caja agregada: tarjeta %d, columna %d (linea %d)" % (card, col, cj))
