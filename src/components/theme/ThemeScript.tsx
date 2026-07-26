export const THEME_STORAGE_KEY = "theme";

/**
 * Applies the theme before the browser paints.
 *
 * This runs as a blocking inline script at the very top of <body>, so the
 * `.dark` class is already on <html> by the time any pixel is drawn — that is
 * what prevents the white flash a dark-mode reader would otherwise see on every
 * navigation. React only takes over afterwards (see ThemeProvider).
 */
const script = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d);
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
