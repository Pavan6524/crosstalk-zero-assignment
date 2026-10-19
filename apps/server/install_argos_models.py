import sys

import argostranslate.package
import argostranslate.translate

LANGUAGES = ["es", "hi", "fr", "ja", "de", "ar"]
REQUIRED_PAIRS = [
    pair
    for language in LANGUAGES
    for pair in [("en", language), (language, "en")]
]

print("Updating Argos package index...")
argostranslate.package.update_package_index()
available = argostranslate.package.get_available_packages()

installed = {
    (language.code, translation.to_lang.code)
    for language in argostranslate.translate.get_installed_languages()
    for translation in language.translations_to
}

for source, target in REQUIRED_PAIRS:
    if (source, target) in installed:
        print(f"Already installed: {source} -> {target}")
        continue

    match = next(
        (
            package for package in available
            if package.from_code == source and package.to_code == target
        ),
        None,
    )

    if match is None:
        print(f"ERROR: No Argos model available for {source} -> {target}")
        sys.exit(1)

    print(f"Downloading model: {source} -> {target}")
    package_path = match.download()
    argostranslate.package.install_from_path(package_path)
    print(f"Installed: {source} -> {target}")

print("Argos language model setup complete.")
