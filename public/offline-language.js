(() => {
  const messages = {
    en: ["Language", "A moment to reconnect.", "You’re offline. Connect to the internet to open your programs and save workouts.", "If you have a workout open in another tab, keep it open and reconnect before saving.", "Try again", "Offline · FORM / ONE"],
    fi: ["Kieli", "Hetki yhteyden palauttamiseen.", "Ei verkkoyhteyttä. Yhdistä verkkoon avataksesi ohjelmasi ja tallentaaksesi harjoituksia.", "Jos harjoituksesi on auki toisessa välilehdessä, pidä se auki ja yhdistä verkkoon ennen tallentamista.", "Yritä uudelleen", "Ei verkkoyhteyttä · FORM / ONE"],
  }
  const select = document.getElementById("language")
  function apply(value) {
    const language = value === "fi" ? "fi" : "en"
    select.value = language
    document.documentElement.lang = language
    document.title = messages[language][5]
    ;["language-label", "heading", "message", "draft", "retry"].forEach((id, index) => {
      document.getElementById(id).textContent = messages[language][index]
    })
  }
  try { apply(localStorage.getItem("form-one-language")) } catch { apply("en") }
  select.addEventListener("change", () => {
    apply(select.value)
    try { localStorage.setItem("form-one-language", select.value) } catch { /* Session-only preference. */ }
  })
})()
