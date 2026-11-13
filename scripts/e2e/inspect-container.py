#!/usr/bin/env python3
"""Print only non-secret container metadata needed by the E2E preflight."""

import json
import sys


def metadata(container):
    selected_env = {}
    for item in container.get("Config", {}).get("Env", []):
        key, separator, value = item.partition("=")
        if separator and key in {"POSTGRES_DB", "POSTGRES_USER"}:
            selected_env[key] = value

    bindings = container.get("HostConfig", {}).get("PortBindings") or {}
    ports = ",".join(
        "{}:{}->{}".format(binding.get("HostIp"), binding.get("HostPort"), target)
        for target, entries in bindings.items()
        for binding in entries or []
    )
    volumes = ",".join(
        mount.get("Name", "")
        for mount in container.get("Mounts", [])
        if mount.get("Type") == "volume"
    )
    labels = container.get("Config", {}).get("Labels") or {}
    state = container.get("State", {})
    return [
        container.get("Name", "").lstrip("/"),
        container.get("Config", {}).get("Image", ""),
        selected_env.get("POSTGRES_DB", ""),
        selected_env.get("POSTGRES_USER", ""),
        ports,
        volumes,
        labels.get("com.docker.compose.project", ""),
        labels.get("com.docker.compose.service", ""),
        state.get("Status", ""),
        state.get("Health", {}).get("Status", ""),
    ]


def main():
    try:
        document = json.load(sys.stdin)
        if not isinstance(document, list) or len(document) != 1:
            raise ValueError("unexpected inspect response")
        print("|".join(metadata(document[0])))
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        print("Could not parse sanitized Docker container metadata.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
