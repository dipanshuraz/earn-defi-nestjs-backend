#!/bin/sh
set -e

PORT="${PORT:-3000}"
echo "Serving dist on 0.0.0.0:${PORT}"
exec serve -s dist -l "tcp://0.0.0.0:${PORT}"
