from __future__ import annotations

import json
import shlex
import shutil
import subprocess
from pathlib import Path
from typing import Iterable, Sequence


class DeploymentError(RuntimeError):
    pass


def load_gitignore(project_root: Path) -> list[str]:
    return _load_ignore_file(project_root / ".gitignore", ".gitignore")


def load_deployignore(project_root: Path) -> list[str]:
    return _load_ignore_file(
        project_root / "Deploy" / ".deployignore",
        ".deployignore",
    )


def _load_ignore_file(path: Path, description: str) -> list[str]:
    if not path.exists():
        print(f"Could not find {description} file: {path}")
        return []

    rules: list[str] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        rules.append(line)

    return rules


def load_config(script_dir: Path) -> dict:
    path = script_dir / "deploy.local.json"
    if not path.exists():
        raise DeploymentError(
            f"Missing {path}. Copy deploy.example.json to deploy.local.json."
        )

    print("JSON path:", path)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise DeploymentError(
            f"Invalid JSON in {path}: line {exc.lineno}, column {exc.colno}: "
            f"{exc.msg}"
        ) from exc


def require_commands(*commands: str) -> None:
    missing = [command for command in commands if shutil.which(command) is None]
    if missing:
        raise DeploymentError(
            "Required command(s) not found: " + ", ".join(missing)
        )


def run(args: Sequence[str]) -> None:
    command = [str(arg) for arg in args]
    print("\n> " + shlex.join(command))

    try:
        result = subprocess.run(command, text=True, check=False)
    except OSError as exc:
        raise DeploymentError(
            f"Could not execute {command[0]}: {exc}"
        ) from exc

    if result.returncode:
        raise DeploymentError(
            f"Command failed with exit code {result.returncode}"
        )


def local_path(path_value: str) -> str:
    path = Path(path_value).expanduser()

    if not path.exists():
        raise DeploymentError(f"Local path does not exist: {path}")
    if not path.is_dir():
        raise DeploymentError(f"Local deployment path is not a directory: {path}")

    return str(path.resolve())


def _unique(items: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(items))


def rsync(
    source: str,
    destination: str,
    excludes: Iterable[str],
    deploy: bool,
    delete: bool,
) -> None:
    # Do not use archive mode (-a) here. Archive mode preserves local
    # permissions, owners, and groups, which can unintentionally alter the
    # production server when deploying from Linux.
    args = [
        "rsync",
        "-rzl",
        "--checksum",
        "--itemize-changes",
        "--human-readable",
        "--protect-args",
    ]

    if not deploy:
        args.append("--dry-run")
    if delete:
        args.append("--delete")

    for item in _unique(excludes):
        args.extend(["--exclude", item])

    args.extend([
        source.rstrip("/") + "/",
        destination.rstrip("/") + "/",
    ])
    run(args)


def restart(host: str, service: str) -> None:
    remote_command = (
        f"systemctl restart {shlex.quote(service)} "
        f"&& systemctl is-active --quiet {shlex.quote(service)}"
    )
    run(["ssh", host, remote_command])
    print(f"{service} restarted successfully.")

