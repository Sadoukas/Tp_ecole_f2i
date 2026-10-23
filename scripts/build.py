"""Génère data/veille.js (chargeable en file://) à partir de data/veille.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "data" / "veille.json").read_text(encoding="utf-8"))
js = "window.VEILLE = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
(ROOT / "data" / "veille.js").write_text(js, encoding="utf-8")

signals = sum(len(t["signaux"]) for t in data["themes"])
print(f"{len(data['themes'])} thèmes, {signals} signaux -> data/veille.js")
