// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const meaningBox = document.getElementById("meaningBox");
  const recentList = document.getElementById("recentList");
  const sourceLangSelect = document.getElementById("sourceLang");

  btn.addEventListener("click", searchWord);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchWord();
  });

  function getTargetLang() {
    return sourceLangSelect.value === "en" ? "ta" : "en";
  }

  async function searchWord() {
    const term = input.value.trim();
    const sourceLang = sourceLangSelect.value;
    const targetLang = getTargetLang();

    if (!term) {
      meaningBox.innerHTML = '<p style="color:#b33;">⚠️ Please enter text.</p>';
      return;
    }

    meaningBox.innerHTML = "<p>⏳ Searching...</p>";

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: term,
          sourceLang,
          targetLang
        })
      });

      const data = await res.json();
      if (data.error) {
        meaningBox.innerHTML = `<p style="color:#b33;">❌ ${data.error}</p>`;
        return;
      }

      let html = `<h3>${escapeHtml(term)}</h3>`;

      // English Dictionary (only when English is source)
      if (data.englishDefinition) {
        const def = data.englishDefinition.definition || "Not found";
        html += `<p><strong>Definition:</strong> ${escapeHtml(def)}</p>`;

        if (data.englishDefinition.example) {
          html += `<p><strong>Example:</strong> ${escapeHtml(data.englishDefinition.example)}</p>`;
        }
      }

      // Translated text
      html += `<p><strong>Translated:</strong> ${escapeHtml(data.translatedText)}</p>`;

      // Transliteration
      if (data.transliteration) {
        html += `<p><strong>Transliteration:</strong> ${escapeHtml(data.transliteration)}</p>`;
      }

      meaningBox.innerHTML = html;

      input.select();
      loadRecent();

    } catch (err) {
      meaningBox.innerHTML = `<p style="color:#b33;">Server error: ${escapeHtml(err.message)}</p>`;
    }
  }

  async function loadRecent() {
    try {
      const res = await fetch("/api/recent");
      const arr = await res.json();
      recentList.innerHTML = arr.length
        ? arr
            .map(
              (item) => `
        <li>
          <strong>${escapeHtml(item.input)}</strong> → ${escapeHtml(item.translated || "—")}
          <br><small>${new Date(item.searched_at).toLocaleString()}</small>
        </li>`
            )
            .join("")
        : "<li>No recent searches</li>";
    } catch (e) {
      recentList.innerHTML = "<li>Failed to load recent</li>";
    }
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"'`]/g, (s) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "`": "&#96;",
    }[s]));
  }

  loadRecent();
});
