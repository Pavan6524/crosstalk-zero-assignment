
#!/usr/bin/env bash
set -e

export ARGOS_PACKAGES_DIR=/opt/render/.local/share/argos-translate/packages

pip install -r requirements.txt
python install_argos_models.py
