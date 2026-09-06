/**
 * Kelime sınırı sayılan karakterler. Bu karakterlerden sonra gelen ilk
 * harf/rakam büyütülür. Kesme işareti (' ’) bilinçli olarak listede yok:
 * "Ahmet'in" -> "Ahmet'in" olarak kalsın, "Ahmet'İn" olmasın.
 */
const WORD_BREAK_CHARS = new Set<string>([
  " ", "\t", "\n", "\r", "\u00a0",
  "-", "–", "—", "_", "/", "\\", "|",
  "(", ")", "[", "]", "{", "}", "<", ">",
  '"', "“", "”", "«", "»",
  ".", ",", ";", ":", "!", "?", "&", "+", "*", "=", "#", "@", "%", "~",
]);

/**
 * Türkçe uyumlu Title Case: metnin tamamını küçültür, ardından her kelimenin
 * baş harfini büyütür. ALL CAPS, karışık ya da tamamen küçük yazılmış girdileri
 * tek tip hale getirir.
 *
 * "KUTU HARF tabela"        -> "Kutu Harf Tabela"
 * "kutu harf - ahmet"       -> "Kutu Harf - Ahmet"
 * "istanbul / ısı yalıtımı" -> "İstanbul / Isı Yalıtımı"
 *
 * Not: URL, kullanıcı adı, şifre ve API anahtarı gibi alanlarda kullanılmamalı.
 */
export function toTitleCase(str: string): string {
  if (!str) return str;

  const lower = str.toLocaleLowerCase("tr-TR");
  let out = "";
  let atWordStart = true;

  for (const ch of lower) {
    if (WORD_BREAK_CHARS.has(ch)) {
      out += ch;
      atWordStart = true;
      continue;
    }
    out += atWordStart ? ch.toLocaleUpperCase("tr-TR") : ch;
    atWordStart = false;
  }

  return out;
}

/** Boş/null değerleri güvenle Title Case'e çevirir, yoksa boş string döner. */
export function titleCaseOr(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  return toTitleCase(value);
}
