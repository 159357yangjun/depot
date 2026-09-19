from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / 'apps/desktop/src'
COMMANDS_RS = ROOT / 'apps/desktop/src-tauri/src/commands.rs'
LIB_RS = ROOT / 'apps/desktop/src-tauri/src/lib.rs'

invoke_pattern = re.compile(r"\binvoke(?:<[^>]+>)?\(\s*['\"]([a-zA-Z0-9_]+)['\"]")
command_pattern = re.compile(r"#\[tauri::command\]\s*\n\s*pub\s+(?:async\s+)?fn\s+([a-zA-Z0-9_]+)", re.MULTILINE)
handler_pattern = re.compile(r"commands::([a-zA-Z0-9_]+)")

frontend_commands: set[str] = set()
for path in FRONTEND.rglob('*.ts*'):
    text = path.read_text(encoding='utf-8')
    frontend_commands.update(invoke_pattern.findall(text))

rust_text = COMMANDS_RS.read_text(encoding='utf-8')
lib_text = LIB_RS.read_text(encoding='utf-8')
rust_commands = set(command_pattern.findall(rust_text))
registered = set(handler_pattern.findall(lib_text))

errors: list[str] = []
missing_rust = sorted(frontend_commands - rust_commands)
missing_registration = sorted(frontend_commands - registered)
unregistered_rust = sorted(rust_commands - registered)
if missing_rust:
    errors.append('Frontend invokes missing Rust commands: ' + ', '.join(missing_rust))
if missing_registration:
    errors.append('Frontend invokes commands not registered in generate_handler!: ' + ', '.join(missing_registration))
if unregistered_rust:
    errors.append('Rust #[tauri::command] functions not registered: ' + ', '.join(unregistered_rust))

if errors:
    print('\n'.join(errors), file=sys.stderr)
    raise SystemExit(1)

print(f'Command contracts: OK | frontend invokes: {len(frontend_commands)} | Rust commands: {len(rust_commands)} | registered: {len(registered)}')
