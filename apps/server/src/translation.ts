
import type { Language } from "@crosstalk/shared";

export interface TranslationProvider {
  translate(
    text: string,
    source: Language,
    target: Language
  ): Promise<string>;
}

export class MockTranslationProvider implements TranslationProvider {
  async translate(
    text: string,
    source: Language,
    target: Language
  ): Promise<string> {
    if (source.code === target.code) return text;
    return `[${target.name} translation] ${text}`;
  }
}

export class ArgosTranslationProvider implements TranslationProvider {
  async translate(
    text: string,
    source: Language,
    target: Language
  ): Promise<string> {
    if (source.code === target.code) return text;

    const response = await fetch(
      process.env.TRANSLATION_SERVICE_URL ??
        "http://127.0.0.1:3002/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source: source.code,
          target: target.code,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Argos translation failed: HTTP ${response.status}`);
    }

    const result = (await response.json()) as {
      translatedText?: string;
    };

    if (!result.translatedText) {
      throw new Error("Argos returned no translated text.");
    }

    return result.translatedText;
  }
}

export function createTranslationProvider(): TranslationProvider {
  const provider = process.env.TRANSLATION_PROVIDER ?? "mock";

  if (provider === "argos") {
    console.log("Translation provider: Argos (local)");
    return new ArgosTranslationProvider();
  }

  console.log("Translation provider: Mock");
  return new MockTranslationProvider();
}
