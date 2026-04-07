#!/usr/bin/env python3
"""
Classify every song in /Songs/*.json by compositionType (Geetham, Swarajathi,
Varnam, Kriti, Tillana, Javali, Padam, Devaranama, Sankeertana) and write the
result back to song_details.compositionType.

Strategy (in priority order):
  1) Hand-curated lookup of well-known beginner Geethams, Swarajathis,
     Varnams, Tillanas, Javalis, and Padams.
  2) Title-keyword detection (e.g. "Varnam", "Tillana", "Geetham" inside the
     name itself).
  3) Composer-based default:
        Annamacharya         -> Sankeertana
        Purandaradasa        -> Devaranama
        everyone else        -> Kriti
"""

import json
import os
import sys
from collections import Counter

SONGS_DIR = os.path.join(os.path.dirname(__file__), '..', 'Songs')

# Well-known beginner Geethams (Purandaradasa Malahari + Mohanam set, Sahana, etc.)
GEETHAM = {
    'Lambodara', 'Kunda Goura', 'Padumanabha', 'Kereya Neeranu', 'Analekara',
    'VaraVeena', 'Vara Veena', 'Sri Gananatha', 'Sree Gananatha',
    'Kamalajaathala', 'Kamalaja Thala',
}

# Well-known Swarajathis (Syama Sastri's Trinity, Adi Appayya, Pallavi Gopala Iyer)
SWARAJATHI = {
    'Rave Himagiri',           # Syama Sastri, Todi
    'Kamakshi',                # Syama Sastri, Bhairavi (the famous one)
    'Sambashivayanave',        # Tyagaraja Swarajathi (sometimes)
}

# Well-known Varnams (Tana, Pada, and Daru Varnams)
VARNAM = {
    'Mate Malaya Dvaja',       # Daru Varnam in Khamas (Spencer Venkatasamy Naidu / Ponniah Pillai)
    'Vanajakshi', 'Viriboni', 'Sami Ninne', 'Nera Nammithi', 'Inta Chala',
    'Era Napai', 'Chalamela', 'Karunimpa',
}

# Well-known Tillanas
TILLANA = {
    # none of the 306 are titled as a tillana, but keep set for keyword fallback
}

# Well-known Javalis
JAVALI = {
    'Idadhu Padam Thooki',     # Patnam Subramania Iyer Javali in Khamas (sometimes classified)
    'Parvai Onre Podhume',     # Common Tamil javali-style piece
    'Punnagai Onre',           # Tamil javali-style
}

# Well-known Padams
PADAM = {
    'Theruvil Varano',         # Khamas padam (not in this set, kept for completeness)
}

# Composer-based defaults (case-insensitive substring match against composer string)
COMPOSER_DEFAULTS = [
    ('annamacharya',         'Sankeertana'),
    ('purandaradasa',        'Devaranama'),
    ('purandara dasa',       'Devaranama'),
    ('sadasiva brahmendra',  'Bhajan'),
    ('kanaka dasa',          'Devaranama'),
    ('vijaya dasa',          'Devaranama'),
]

# Title-keyword fallback (substring, case-insensitive). First match wins.
TITLE_KEYWORDS = [
    ('tillana',     'Tillana'),
    ('thillana',    'Tillana'),
    ('varnam',      'Varnam'),
    ('geetham',     'Geetham'),
    ('geetam',      'Geetham'),
    ('swarajathi',  'Swarajathi'),
    ('swarajati',   'Swarajathi'),
    ('javali',      'Javali'),
    ('padam',       'Padam'),
    ('shlokam',     'Slokam'),
    ('slokam',      'Slokam'),
    ('viruttam',    'Viruttam'),
]


def classify(name: str, composer: str) -> str:
    name_norm = (name or '').strip()
    composer_norm = (composer or '').strip().lower()

    if name_norm in GEETHAM:    return 'Geetham'
    if name_norm in SWARAJATHI: return 'Swarajathi'
    if name_norm in VARNAM:     return 'Varnam'
    if name_norm in TILLANA:    return 'Tillana'
    if name_norm in JAVALI:     return 'Javali'
    if name_norm in PADAM:      return 'Padam'

    name_lower = name_norm.lower()
    for kw, label in TITLE_KEYWORDS:
        if kw in name_lower:
            return label

    for needle, label in COMPOSER_DEFAULTS:
        if needle in composer_norm:
            return label

    return 'Kriti'


def main():
    files = sorted(f for f in os.listdir(SONGS_DIR) if f.endswith('.json'))
    counts = Counter()
    failures = []

    for fname in files:
        path = os.path.join(SONGS_DIR, fname)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            failures.append(f"{fname}: read error {e}")
            continue

        sd = data.setdefault('song_details', {})
        comp_type = classify(sd.get('name', ''), sd.get('composer', ''))
        sd['compositionType'] = comp_type
        counts[comp_type] += 1

        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            failures.append(f"{fname}: write error {e}")

    print(f"Classified {sum(counts.values())} songs:")
    for label, n in counts.most_common():
        print(f"  {label:12s} {n}")
    if failures:
        print(f"\n{len(failures)} failures:")
        for line in failures:
            print(f"  {line}")
        sys.exit(1)


if __name__ == '__main__':
    main()
