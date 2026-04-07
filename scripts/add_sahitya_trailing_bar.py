#!/usr/bin/env python3
"""
Walk every /Songs/*.json file and ensure each non-empty sahitya string ends
with ` ||` (spaced like the swara fields). Empty sahityas are left alone.

Idempotent — entries that already end in `||` are skipped.
"""
import json
import os
import sys

SONGS_DIR = os.path.join(os.path.dirname(__file__), '..', 'Songs')


def normalize_trailing_bar(s: str) -> str:
    """Return the string with a trailing ` ||` if it doesn't already have one."""
    rstripped = s.rstrip()
    if not rstripped:
        return s  # empty / whitespace-only — leave alone
    if rstripped.endswith('||'):
        return s  # already terminated
    # Append a single space + || (matching the swara convention)
    return rstripped + ' ||'


def main():
    files = sorted(f for f in os.listdir(SONGS_DIR) if f.endswith('.json'))
    files_changed = 0
    entries_changed = 0

    for fname in files:
        path = os.path.join(SONGS_DIR, fname)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"skip {fname}: {e}")
            continue

        changed = False
        for section in data.get('composition', []):
            for entry in section.get('content', []):
                sah = entry.get('sahitya')
                if not isinstance(sah, str):
                    continue
                # Skip entirely empty sahityas — those are intentional
                # (e.g. pure swara passages with no syllables).
                if not sah.strip():
                    continue
                new = normalize_trailing_bar(sah)
                if new != sah:
                    entry['sahitya'] = new
                    entries_changed += 1
                    changed = True

        if changed:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            files_changed += 1

    print(f"Files updated: {files_changed}")
    print(f"Entries updated: {entries_changed}")


if __name__ == '__main__':
    main()
