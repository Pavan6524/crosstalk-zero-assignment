
#!/usr/bin/env bash
set -e

export ARGOS_PACKAGES_DIR="/opt/render/project/src/apps/server/argos-packages"

pip install -r requirements.txt
python install_argos_models.py

echo "Checking installed Argos model files:"
find "$ARGOS_PACKAGES_DIR" -maxdepth 2 -name "metadata.json" -print
