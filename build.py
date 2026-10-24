"""Optional Python wrapper: build the bundled Three.js offline preview."""
from pathlib import Path
import subprocess
subprocess.run(['node','build.mjs'],cwd=Path(__file__).resolve().parent,check=True)
