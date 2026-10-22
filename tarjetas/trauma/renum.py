import sys, io, re
f = sys.argv[1]
s = io.open(f, encoding="utf-8").read()
NUM = [chr(0x2460+i) for i in range(20)]   # (1) .. (20)
parts = s.split('<div class="card card2">')
out = []
for p in parts:
    c = [0]
    def rep(m):
        c[0] += 1
        return m.group(1) + NUM[c[0]-1] + " "
    out.append(re.sub(r'(<span class="box-title t-[a-e]">)\s*(?:[①-⑳]|✏|●)?\s*', rep, p))
io.open(f,"w",encoding="utf-8").write('<div class="card card2">'.join(out))
print("renumerado")
