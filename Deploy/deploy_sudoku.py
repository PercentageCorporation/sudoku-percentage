from __future__ import annotations

import argparse
import sys
from pathlib import Path

from deploy_common import (
    DeploymentError,
    load_config,
    load_deployignore,
    load_gitignore,
    local_path,
    require_commands,
    restart,
    rsync,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Deploy Sudoku from Linux to the production server."
    )
    parser.add_argument(
        "package",
        help="Which package to deploy: web | pwa",
    )
    parser.add_argument(
        "--deploy",
        action="store_true",
        help="Perform the deployment. Without this option, rsync is a dry run.",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete remote files that no longer exist locally, subject to excludes.",
    )
    parser.add_argument("--skip-service-restart", action="store_true")
    parser.add_argument("--skip-caddy-restart", action="store_true")
    args = parser.parse_args()

    require_commands("rsync", "ssh")

    config_dir = Path(__file__).resolve().parent
    print("cfg path:", config_dir)
    project_root = config_dir.parent
    print("project_root:", project_root)


    #inv_root = project_root.parent
    #print("inv_root:", inv_root)
    config = load_config(Path(project_root, "Deploy"))

    package = args.package
    print("package: ", package)

    if package !== 'pwa' and package !== 'web':
        print("\nYou must specify 'pwa' or 'web'!")
        return
    
    settings = config[package]
    source = local_path(settings["local_path"])
    destination = f'{config["ssh_host"]}:{settings["remote_path"]}'
    service = settings.get("service")

    excludes = [
        ".git/",
        ".vscode/",
        ".env",
    ]


    # excludes.extend(load_gitignore(project_root))
    # excludes.extend(load_deployignore(project_root))

    # # Preserve order while removing duplicate rules.
    # excludes = list(dict.fromkeys(excludes))

    print("source:", source)
    print("destination:", destination)
    print("excludes:", excludes)
    print("service: ", service)
    print(
        "Deploying Sudoku Percentage"
        if args.deploy
        else "Sudoku Percentage DRY RUN — no files will be changed."
    )

    rsync(source, destination, excludes, args.deploy, args.delete)


    if not args.deploy:
        print("\nDry run complete. Re-run with --deploy.")
        return

    if service and not args.skip_service_restart:
        restart(config["ssh_host"], service)

    if settings.get("restart_caddy", True) and not args.skip_caddy_restart:
        restart(config["ssh_host"], "caddy.service")

    print("Sudoku Percentage deployment completed.")


if __name__ == "__main__":
    try:
        main()
    except (DeploymentError, KeyError) as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
