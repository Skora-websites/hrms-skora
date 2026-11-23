#!/bin/bash
# Root deployment entry point for aaPanel Git Manager
# Simply invokes scripts/deploy-aapanel.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/scripts/deploy-aapanel.sh"
