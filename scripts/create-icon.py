from PIL import Image,ImageDraw
from pathlib import Path
p=Path("src-tauri/icons");p.mkdir(parents=True,exist_ok=True)
i=Image.new("RGBA",(256,256),"#13172b");d=ImageDraw.Draw(i);d.rounded_rectangle((32,32,224,224),radius=40,fill="#7259ef");d.line((80,130,176,130),fill="white",width=18);d.line((148,102,176,130,148,158),fill="white",width=18)
for n in [32,128]:i.resize((n,n)).save(p/f"{n}x{n}.png")
i.save(p/"icon.ico",format="ICO",sizes=[(32,32),(48,48),(64,64),(128,128),(256,256)])
