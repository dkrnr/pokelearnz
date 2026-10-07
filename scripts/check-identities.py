#!/usr/bin/env python3
"""Check commit emails without printing unapproved personal details."""
import pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
OWNER = "250664980+dkrnr@users.noreply.github.com"
OWNER_NAME = "Dunith Kerner"
ALLOWED = {line.strip() for line in (ROOT / ".githooks/allowed-emails.txt").read_text().splitlines() if line.strip() and not line.startswith("#")}

def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()

def check_local():
    if git("config", "user.email") != OWNER:
        raise ValueError("Set this checkout's user.email to the approved dkrnr noreply email.")
    if git("config", "user.name") != OWNER_NAME:
        raise ValueError("Set this checkout's user.name to the approved dkrnr profile name.")
    for role in ["AUTHOR", "COMMITTER"]:
        ident = git("var", "GIT_" + role + "_IDENT")
        email = ident.rsplit("<", 1)[-1].split(">", 1)[0]
        name = ident.rsplit("<", 1)[0].strip()
        if email != OWNER or name != OWNER_NAME:
            raise ValueError("An environment or command override changes the " + role.lower() + " identity.")

def check_commits(revisions):
    if not revisions:
        return
    # Revisions come from Git hooks or fixed GitHub event SHAs; -- separates paths.
    data = git("log", "--format=%H%x1f%ae%x1f%ce", *revisions, "--")
    failures = []
    for line in data.splitlines():
        sha, author, committer = line.split("\x1f")
        for role, email in [("author", author), ("committer", committer)]:
            if email not in ALLOWED:
                failures.append(sha[:12] + " (" + role + " email not approved)")
    if failures:
        raise ValueError("Commit identity check failed: " + "; ".join(failures))

def pre_push():
    check_local()
    for line in sys.stdin:
        local_ref, local_sha, remote_ref, remote_sha = line.split()
        if not local_sha.strip("0"):
            continue
        known = remote_sha.strip("0") and subprocess.run(["git", "-C", str(ROOT), "cat-file", "-e", remote_sha + "^{commit}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
        check_commits([remote_sha + ".." + local_sha] if known else [local_sha])

try:
    if sys.argv[1:] == ["--local"]:
        check_local()
    elif sys.argv[1:] == ["--pre-push"]:
        pre_push()
    elif sys.argv[1:]:
        check_commits(sys.argv[1:])
    else:
        raise ValueError("Usage: check-identities.py --local | --pre-push | <revision-range>...")
except (ValueError, subprocess.CalledProcessError) as error:
    # Never echo an unexpected email/name, command output, or environment value.
    print(str(error) if isinstance(error, ValueError) else "Could not resolve Git identity or revision range.", file=sys.stderr)
    sys.exit(1)
