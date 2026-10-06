"""Run with the backend environment, from the repository root."""

import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "backend"))

from app.main import app  # noqa: E402

output = root / "contracts" / "openapi.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Exported {output}")
