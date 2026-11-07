"""
Generate the static font instances used by PDF export (static/pdf-fonts).

The editor uses variable WOFF2 fonts, but the PDF library can only embed static fonts, so every
weight of every family is instanced once here and committed. A manifest maps
family -> style -> weight -> file; the exporter downloads only the files a document uses.

Requires: pip install fonttools brotli
Run:      python3 scripts/generate-pdf-fonts.py
"""
import io
import json
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src/lib/fonts')
OUT = os.path.join(ROOT, 'static/pdf-fonts')
WEIGHTS = range(100, 1000, 100)
STATIC_WEIGHTS = {
    'Thin': 100, 'ExtraLight': 200, 'Light': 300, 'Regular': 400, 'Medium': 500,
    'SemiBold': 600, 'Bold': 700, 'ExtraBold': 800, 'Black': 900,
}


def save(font, name):
    font.flavor = 'woff'
    font.save(os.path.join(OUT, name))


def static_weight(filename):
    """Lato-BoldItalic.woff2 -> (700, 'italic'); Lato-Italic.woff2 -> (400, 'italic')."""
    part = filename.removesuffix('.woff2').split('-', 1)[1]
    italic = part.endswith('Italic')
    word = part.removesuffix('Italic') or 'Regular'
    return STATIC_WEIGHTS[word], 'italic' if italic else 'normal'


def main():
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):
        os.remove(os.path.join(OUT, old))

    manifest = {}
    for directory in sorted(os.listdir(SRC)):
        folder = os.path.join(SRC, directory)
        if not os.path.isdir(folder):
            continue
        family = directory.replace('-', ' ').title()
        styles = manifest.setdefault(family, {})

        for filename in sorted(os.listdir(folder)):
            # Only the latin file is used; characters outside it fall back to '?' in the PDF
            if not filename.endswith('.woff2') or 'latin-ext' in filename:
                continue
            font = TTFont(os.path.join(folder, filename))
            font.flavor = None

            if 'fvar' not in font:
                weight, style = static_weight(filename)
                name = f'{directory}-{style}-{weight}.woff'
                save(font, name)
                styles.setdefault(style, {})[str(weight)] = name
                continue

            style = 'italic' if 'Italic' in filename else 'normal'
            axis = next(a for a in font['fvar'].axes if a.axisTag == 'wght')
            buffer = io.BytesIO()
            font.save(buffer)
            for weight in WEIGHTS:
                if not axis.minValue <= weight <= axis.maxValue:
                    continue
                instance = instancer.instantiateVariableFont(TTFont(io.BytesIO(buffer.getvalue())), {'wght': weight})
                name = f'{directory}-{style}-{weight}.woff'
                save(instance, name)
                styles.setdefault(style, {})[str(weight)] = name

    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
        f.write('\n')
    files = [n for n in os.listdir(OUT) if n.endswith('.woff')]
    size = sum(os.path.getsize(os.path.join(OUT, n)) for n in files)
    print(f'{len(files)} fonts, {size / 1e6:.1f} MB')


main()
