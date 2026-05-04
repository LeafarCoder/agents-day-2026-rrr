from __future__ import annotations

import logging
import sys

_FMT = "%(asctime)s  %(levelname)-8s  %(name)-24s  %(message)s"
_DATE = "%H:%M:%S"


def _setup() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_FMT, datefmt=_DATE))
    root = logging.getLogger()
    if not root.handlers:
        root.addHandler(handler)
    root.setLevel(logging.INFO)
    logging.getLogger("googleapiclient.discovery_cache").setLevel(logging.ERROR)


_setup()


def get(name: str) -> logging.Logger:
    return logging.getLogger(name)
