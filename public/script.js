// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const meaningBox = document.getElementById("meaningBox");
  const recentList = document.getElementById("recentList");

  btn.addEventListener("click", searchWord);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchWord();
  });

  async function searchWord() {
    const term = input.value.trim();
    if (!term) {
      meaningBox.innerHTML = '<p style="color:#b33;">⚠️ Please enter a word.</p>';
      return;
    }
    meaningBox.innerHTML = '<p>⏳ Searching...</p>';

    try {
      const res = await fetch(`/api/word/${encodeURIComponent(term)}`);
      const data = await res.json();

      if (data.error) {
        meaningBox.innerHTML = `<p style="color:#b33;">❌ ${data.error}</p>`;
        return;
      }

      let html = `<h3>${escapeHtml(data.word)}</h3>`;

      if (data.english?.definition) {
        html += `<p><strong>Definition:</strong> ${escapeHtml(data.english.definition)}</p>`;
      } else {
        html += `<p><strong>Definition:</strong> Not found</p>`;
      }

      if (data.english?.example) {
        html += `<p><strong>Example:</strong> ${escapeHtml(data.english.example)}</p>`;
      }

      if (data.tamil) {
        html += `<p class="tamil"><strong>Tamil:</strong> <span class="tamil-text">${escapeHtml(data.tamil)}</span></p>`;
      }

      if (data.tamil_transliteration) {
        html += `<p><strong>Transliteration:</strong> ${escapeHtml(data.tamil_transliteration)}</p>`;
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
        ? arr.map(item => `<li><strong>${escapeHtml(item.word)}</strong> — ${escapeHtml(item.tamil||'—')} <br><small>${new Date(item.searched_at).toLocaleString()}</small></li>`).join("")
        : "<li>No recent searches</li>";
    } catch (e) {
      recentList.innerHTML = "<li>Failed to load recent</li>";
    }
  }

  // Simple escape for safety when showing fetched text
  function escapeHtml(str='') {
    return String(str).replace(/[&<>"'`]/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[s]));
  }

  // initial load
  loadRecent();
});
