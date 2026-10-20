import os
import json
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

import argostranslate.translate


def translate_with_mymemory(text):
    params = urllib.parse.urlencode({
        "q": text,
        "langpair": "es|en",
    })
    url = "https://api.mymemory.translated.net/get?" + params
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "CrossTalk/1.0"},
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        raw = response.read()
        result = json.loads(raw.decode("utf-8", errors="replace"))

    if result.get("responseStatus") != 200:
        raise RuntimeError(
            result.get("responseDetails") or "MyMemory translation failed"
        )

    translated = result.get("responseData", {}).get("translatedText", "")
    if not translated.strip():
        raise RuntimeError("MyMemory returned empty translation")

    return translated


class TranslationHandler(BaseHTTPRequestHandler):
   def do_GET(self):
    path = urllib.parse.urlparse(self.path).path

    if path == "/health":
        self.send_json(200, {"status": "ok"})
    else:
        self.send_json(404, {"error": "Not found"})

    def do_POST(self):
       path = urllib.parse.urlparse(self.path).path

if path != "/translate":
            self.send_json(404, {"error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))

            text = payload.get("text")
            source = payload.get("source")
            target = payload.get("target")

            if not isinstance(text, str) or not text.strip():
                self.send_json(400, {"error": "Text is required"})
                return

            if not isinstance(source, str) or not isinstance(target, str):
                self.send_json(400, {"error": "Source and target are required"})
                return

            if source == target:
                self.send_json(200, {"translatedText": text})
                return

            # Route Spanish -> English through MyMemory only.
            if source == "es" and target == "en":
                try:
                    translated = translate_with_mymemory(text)
                    print("[TranslationService] Spanish -> English: MyMemory")
                    self.send_json(200, {"translatedText": translated})
                except Exception as error:
                    print(f"[TranslationService] MyMemory failed: {error}")
                    self.send_json(
                        502,
                        {"error": "Spanish-to-English translation unavailable"},
                    )
                return

            # All other language pairs continue using local Argos.
            languages = {
                language.code: language
                for language in argostranslate.translate.get_installed_languages()
            }

            if source not in languages or target not in languages:
                self.send_json(400, {"error": "Unsupported language"})
                return

            try:
                translated = languages[source].get_translation(
                    languages[target]
                ).translate(text)
            except Exception:
                if source == "en" or target == "en":
                    raise

                via_english = languages[source].get_translation(
                    languages["en"]
                ).translate(text)

                translated = languages["en"].get_translation(
                    languages[target]
                ).translate(via_english)

            self.send_json(200, {"translatedText": translated})

        except Exception as error:
            print(f"[TranslationService] Translation error: {error}")
            self.send_json(500, {"error": "Translation failed"})

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string, *args):
        print(f"[TranslationService] {args[0]}")


if __name__ == "__main__":
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", "3002"))

    server = HTTPServer((host, port), TranslationHandler)
    print(f"CrossTalk translation service running on port {port}")
    server.serve_forever()
