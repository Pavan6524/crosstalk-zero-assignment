
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ArgosTranslationProvider,
  MockTranslationProvider,
  createTranslationProvider,
} from "./translation";
import type { Language } from "@crosstalk/shared";

const english = { code: "en", name: "English" } as Language;
const spanish = { code: "es", name: "Spanish" } as Language;
const hindi = { code: "hi", name: "Hindi" } as Language;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("MockTranslationProvider", () => {
  it("returns the original text when source and target match", async () => {
    const provider = new MockTranslationProvider();

    await expect(
      provider.translate("Hello", english, english)
    ).resolves.toBe("Hello");
  });

  it("returns the demo translation placeholder for different languages", async () => {
    const provider = new MockTranslationProvider();

    await expect(
      provider.translate("Hello", english, hindi)
    ).resolves.toBe("[Hindi translation] Hello");
  });
});

describe("ArgosTranslationProvider", () => {
  it("returns the original text when source and target match", async () => {
    const provider = new ArgosTranslationProvider();

    await expect(
      provider.translate("Hello", english, english)
    ).resolves.toBe("Hello");
  });

  it("sends a request and returns the translated text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: "Hola" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const provider = new ArgosTranslationProvider();

    await expect(
      provider.translate("Hello", english, spanish)
    ).resolves.toBe("Hola");

    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe("http://127.0.0.1:3002/translate");
    expect(JSON.parse(options.body)).toEqual({
      text: "Hello",
      source: "en",
      target: "es",
    });
  });

  it("throws when the translation service returns an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );

    const provider = new ArgosTranslationProvider();

    await expect(
      provider.translate("Hello", english, spanish)
    ).rejects.toThrow("Argos translation failed: HTTP 503");
  });

  it("throws when the service returns no translated text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
    );

    const provider = new ArgosTranslationProvider();

    await expect(
      provider.translate("Hello", english, spanish)
    ).rejects.toThrow("Argos returned no translated text.");
  });
});

describe("createTranslationProvider", () => {
  it("selects Argos when configured", () => {
    vi.stubEnv("TRANSLATION_PROVIDER", "argos");

    expect(createTranslationProvider()).toBeInstanceOf(
      ArgosTranslationProvider
    );
  });

  it("defaults to the mock provider", () => {
    vi.stubEnv("TRANSLATION_PROVIDER", "");

    expect(createTranslationProvider()).toBeInstanceOf(
      MockTranslationProvider
    );
  });
});
