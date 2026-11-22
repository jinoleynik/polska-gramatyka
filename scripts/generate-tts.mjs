#!/usr/bin/env node
/**
 * Downloads short MP3 clips for sluchaj.html (same-origin TTS for iPad/Safari).
 * Usage: node scripts/generate-tts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.join(__dirname, "..", "public", "tts");

const LANGS = {
  uk: {
    tts: "uk",
    letters: "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ".split(""),
    digits: {
      "0": "нуль", "1": "один", "2": "два", "3": "три", "4": "чотири",
      "5": "п'ять", "6": "шість", "7": "сім", "8": "вісім", "9": "дев'ять"
    },
    letterNames: {
      "А": "літера а", "Б": "літера бе", "В": "літера ве", "Г": "літера ге",
      "Ґ": "літера ґе", "Д": "літера де", "Е": "літера е", "Є": "літера є",
      "Ж": "літера же", "З": "літера зе", "И": "літера и", "І": "літера і",
      "Ї": "літера ї", "Й": "літера йот", "К": "літера ка", "Л": "літера ел",
      "М": "літера ем", "Н": "літера ен", "О": "літера о", "П": "літера пе",
      "Р": "літера ер", "С": "літера ес", "Т": "літера те", "У": "літера у",
      "Ф": "літера еф", "Х": "літера ха", "Ц": "літера це", "Ч": "літера че",
      "Ш": "літера ша", "Щ": "літера ща", "Ь": "м'який знак",
      "Ю": "літера ю", "Я": "літера я"
    }
  },
  pl: {
    tts: "pl",
    letters: "AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ".split(""),
    digits: {
      "0": "zero", "1": "jeden", "2": "dwa", "3": "trzy", "4": "cztery",
      "5": "pięć", "6": "sześć", "7": "siedem", "8": "osiem", "9": "dziewięć"
    },
    letterNames: {
      "A": "litera a", "Ą": "litera ą", "B": "litera be", "C": "litera ce",
      "Ć": "litera cie", "D": "litera de", "E": "litera e", "Ę": "litera ę",
      "F": "litera ef", "G": "litera gie", "H": "litera ha", "I": "litera i",
      "J": "litera jot", "K": "litera ka", "L": "litera el", "Ł": "litera eł",
      "M": "litera em", "N": "litera en", "Ń": "litera eń", "O": "litera o",
      "Ó": "litera o kreskowane", "P": "litera pe", "R": "litera er",
      "S": "litera es", "Ś": "litera eś", "T": "litera te", "U": "litera u",
      "W": "litera wu", "Y": "litera y", "Z": "litera zet", "Ź": "litera ziet",
      "Ż": "litera żet"
    }
  },
  en: {
    tts: "en",
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    digits: {
      "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
      "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine"
    },
    letterNames: {
      "A": "ay", "B": "bee", "C": "cee", "D": "dee", "E": "ee",
      "F": "eff", "G": "jee", "H": "aitch", "I": "eye", "J": "jay",
      "K": "kay", "L": "el", "M": "em", "N": "en", "O": "oh",
      "P": "pee", "Q": "cue", "R": "ar", "S": "ess", "T": "tee",
      "U": "you", "V": "vee", "W": "double you", "X": "ex",
      "Y": "why", "Z": "zee"
    }
  }
};

function audioKey(symbol) {
  if (/^\d$/.test(symbol)) return `d-${symbol}`;
  return `l-${symbol.codePointAt(0).toString(16)}`;
}

function ttsUrl(text, ttsLang) {
  const q = encodeURIComponent(text);
  return `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(ttsLang)}&q=${q}`;
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; gramatyka-tts/1.0)",
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`Too small audio (${buf.length}b) for ${url}`);
  fs.writeFileSync(dest, buf);
}

async function main() {
  let ok = 0;
  let fail = 0;

  for (const [langKey, cfg] of Object.entries(LANGS)) {
    const dir = path.join(outRoot, langKey);
    fs.mkdirSync(dir, { recursive: true });

    const jobs = [];
    for (const letter of cfg.letters) {
      jobs.push({ symbol: letter, text: cfg.letterNames[letter] });
    }
    for (const [digit, text] of Object.entries(cfg.digits)) {
      jobs.push({ symbol: digit, text });
    }

    for (const job of jobs) {
      const dest = path.join(dir, `${audioKey(job.symbol)}.mp3`);
      const url = ttsUrl(job.text, cfg.tts);
      try {
        if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
          ok += 1;
          continue;
        }
        process.stdout.write(`${langKey}/${audioKey(job.symbol)} ... `);
        await download(url, dest);
        console.log("ok");
        ok += 1;
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        fail += 1;
        console.log("FAIL", err.message);
      }
    }
  }

  console.log(`Done. ok=${ok} fail=${fail}`);
  if (fail) process.exitCode = 1;
}

main();
