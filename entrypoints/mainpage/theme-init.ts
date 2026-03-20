(() => {
  try {
    const theme = localStorage.getItem("theme");
    if (theme) document.documentElement.classList.add(theme);
    const isDark = theme === "dark";
    document.documentElement.style.backgroundColor = isDark
      ? "#000000"
      : "#fcfcfc";
  } catch {
    // Ignore theme init errors
  }
})();

