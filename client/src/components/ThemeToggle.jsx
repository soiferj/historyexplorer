import React from "react";

export default function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      className="flex items-center gap-2 px-3 py-1 rounded-xl border border-blue-400 bg-gray-800 text-blue-200 hover:bg-blue-700 hover:text-white font-semibold shadow transition-all duration-200 text-xs sm:text-base"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark/light mode"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{ minWidth: 40 }}
    >
      {theme === "dark" ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0112 21.75c-5.385 0-9.75-4.365-9.75-9.75 0-4.136 2.664-7.64 6.398-9.09a.75.75 0 01.908.911A7.501 7.501 0 0019.5 15.75a.75.75 0 01.911.908 9.714 9.714 0 01-1.659 2.344z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m8.485-8.485l-1.06 1.06M4.515 4.515l1.06 1.06M21 12h-1.5M4.5 12H3m15.485 4.485l-1.06-1.06M4.515 19.485l1.06-1.06M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
      )}
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"} Mode</span>
    </button>
  );
}
