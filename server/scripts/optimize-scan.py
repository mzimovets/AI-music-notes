#!/usr/bin/env python3
"""
Переделывает скан ABBYY (слои JPEG2000/JBIG2 — самая медленная распаковка
из возможных) в один цветной JPEG на страницу. Причина и рецепт разобраны
в TODO.md, пункт 2: те же 200 dpi и качество 82, что проверялись вручную.

Цвет сохраняется намеренно, не как оставшаяся возможность: на пробном файле
цветная версия оказалась тяжелее серой всего на 2% и открывается настолько
же быстро — весь выигрыш даёт сама смена формата, а не потеря цвета. При
этом на нотах встречаются цветные пометки (кем спеть, что важно), и их
не хотелось стирать бесплатно.

Печатает в stdout один JSON-объект с результатом — так его читает и
пакетный скрипт optimize-scans.js, и загрузка ноты на сервере.

Использование:
  python3 optimize-scan.py вход.pdf выход.pdf
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


def fail(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}))
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 3:
        fail("нужно два пути: вход.pdf выход.pdf")

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    if not src.is_file():
        fail(f"файл не найден: {src}")

    with tempfile.TemporaryDirectory(prefix="scan-opt-") as tmp:
        prefix = Path(tmp) / "p"
        try:
            subprocess.run(
                [
                    "pdftoppm", "-r", "200", "-jpeg",
                    "-jpegopt", "quality=82",
                    str(src), str(prefix),
                ],
                check=True,
                capture_output=True,
                timeout=180,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            fail(f"pdftoppm не справился: {e}")

        pages = sorted(Path(tmp).glob("p-*.jpg"))
        if not pages:
            fail("pdftoppm не создал ни одной страницы")

        images = [Image.open(p) for p in pages]
        try:
            images[0].save(
                dst,
                "PDF",
                save_all=True,
                append_images=images[1:],
                resolution=200.0,
            )
        except Exception as e:
            fail(f"не удалось собрать PDF: {e}")

    print(json.dumps({
        "ok": True,
        "pages": len(pages),
        "originalSize": src.stat().st_size,
        "newSize": dst.stat().st_size,
    }))


if __name__ == "__main__":
    main()
