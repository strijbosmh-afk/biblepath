# Lived religion: editorial and source notes

Reviewed 9 November 2026. The three religion collections remain separate. Each factual block points to one or more source IDs; source panels distinguish scripture, religious interpretation, an organization’s own account and historical documents. Summaries are original editorial paraphrases rather than long reproduced quotations.

Catholic sources include the Dutch Catholic Bible, the Catechism, Sacrosanctum Concilium, Fratelli tutti, the 2019 Human Fraternity document and Sant’Egidio’s international/Belgian accounts of prayer, Kamiano, older people, humanitarian corridors and Mozambique. Assisi 1986 is contextualized as an encounter while preserving religious differences.

Jewish sources include the Hebrew Tanakh, Mishnah, Talmud and Maimonides via Sefaria, HIAS’s own mission and the ICJS publication of Dabru Emet. These texts and organizational examples do not represent every Jewish movement. Islamic sources include Qur’an passages, hadith, Dar al-Ifta, a Shia explanation of combining prayers, Islamic Relief’s own account, the Marrakesh declaration and the signed Human Fraternity document. Differences of interpretation are described rather than collapsed into a single practice.

All 31 internal scripture ranges are tested against actual reader edition data, including final verses. Source URLs are HTTPS and remain individually visible in every dossier. An automated audit checked 58 distinct external URLs: 56 returned success, one USCCB Leviticus URL rejected automated access with HTTP 403, and a Sefaria Numbers request timed out (subsequently opened successfully through web lookup). These access limitations are not proof of dead links. There are no generated quotes, audio or interviews.

Maps use approximate city-centre coordinates, with this limitation shown beside the map. Mozambique negotiations were held in Rome; Assisi 1986 and the 2020 signature of Fratelli tutti are placed in Assisi. The six documented historical cases have reciprocal timeline links. Hillel, teshuva and sulh dossiers remain interpretive discussions and are not assigned invented historical dates.

Dataset shape: `meta` gives scope and section notes; each `entry` contains title, summary, three sourced context blocks, a documented practice description and source records. Peace entries add stakeholders and process. Never add a passage without validating its edition-specific numbering. Keep `dist/timeline-events.json` and its documentation snapshot synchronized when adding events.

Hebrew reader correction: the pinned WLC source encodes literal apostrophe-delimited lemma/typography wrappers in ten verses, including Deuteronomy 6:4. The importer now removes only these exact wrappers, retaining enclosed Hebrew letters and accents. All other verse texts and numbering are unchanged; the output text hash is regenerated and the importer check reproduces it.
