#!/usr/bin/env python3
"""
Walk every /Songs/*.json file and normalize the case of each non-empty
sahitya field. For every whitespace-separated token, the first alphabetic
character is uppercased and all other alphabetic characters are lowercased.
Non-letter characters (-, (, ), ., ,, ;, |, —, etc.) and whitespace runs
are preserved exactly.

Idempotent — running it twice produces the same output as running it once.
"""
import json
import os
import re

SONGS_DIR = os.path.join(os.path.dirname(__file__), '..', 'Songs')


def title_case_token(tok: str) -> str:
    out = []
    seen_alpha = False
    for ch in tok:
        if ch.isalpha():
            if not seen_alpha:
                out.append(ch.upper())
                seen_alpha = True
            else:
                out.append(ch.lower())
        else:
            out.append(ch)
    return ''.join(out)


def normalize_sahitya(s: str) -> str:
    return re.sub(r'\S+', lambda m: title_case_token(m.group(0)), s)


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
                if not isinstance(sah, str) or not sah.strip():
                    continue
                new = normalize_sahitya(sah)
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
