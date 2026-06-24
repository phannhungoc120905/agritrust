"use client";

import { useEffect, useState } from "react";

export type Language = "vi" | "en";

const STORAGE_KEY = "agritrust_language";
const LANGUAGE_CHANGE_EVENT = "agritrust_language_change";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "en" ? "en" : "vi";
}

export function setStoredLanguage(language: Language) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_CHANGE_EVENT, { detail: language }));
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    const initial = getStoredLanguage();
    setLanguageState(initial);
    document.documentElement.lang = initial;

    const handleLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next === "vi" || next === "en") {
        setLanguageState(next);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setLanguageState(event.newValue === "en" ? "en" : "vi");
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    setStoredLanguage(next);
  };

  return { language, setLanguage, isEnglish: language === "en" };
}
