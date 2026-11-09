/* Interface language and source text editions are independent. */
(function(root){
 'use strict';
 const rows=[['Language','Interfacetaal','Langue de l’interface'],['Choose language','Kies een interfacetaal','Choisir la langue de l’interface'],['Interface language','Interfacetaal','Langue de l’interface'],['Text language','Teksttaal','Langue du texte'],['Translation','Vertaling','Traduction'],['Original language text','Grondtekst','Texte en langue originale'],['Edition','Editie','Édition'],['Original source','Bekijk oorspronkelijke bron','Voir la source originale'],['Open original source','Bekijk oorspronkelijke bron','Voir la source originale'],['Source','Bekijk oorspronkelijke bron','Voir la source originale'],['Read passage','Lees passage','Lire le passage'],['Scripture and commentary are shown separately.','Schrifttekst of vertaling en commentaar staan afzonderlijk.','Le texte ou sa traduction et le commentaire sont présentés séparément.'],['Changing the interface language does not translate the selected text.','De interfacetaal vertaalt de gekozen tekst niet. Elke teksteditie houdt haar eigen taal, bron en versnummering.','La langue de l’interface ne traduit pas le texte choisi. Chaque édition conserve sa langue, sa source et sa numérotation.']];
 root.BibleI18n?.registerRows(rows);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const t=s=>root.BibleI18n?.t(s)||s;
 const languages={nl:{nl:'Nederlands',en:'Dutch',fr:'Néerlandais'},en:{nl:'Engels',en:'English',fr:'Anglais'},fr:{nl:'Frans',en:'French',fr:'Français'},he:{nl:'Hebreeuws',en:'Hebrew',fr:'Hébreu'},ar:{nl:'Arabisch',en:'Arabic',fr:'Arabe'}};
 function textContext({tradition,edition,language,title}={}){
  const ui=root.BibleI18n?.language||'nl',lang=languages[language]?.[ui]||language||'—',kind=tradition==='judaism'&&edition==='he'||tradition==='islam'&&edition==='ar'?'Original language text':'Translation';
  return `<aside class="source-context" role="note"><span><strong>${esc(t('Interface language'))}:</strong> ${esc(languages[ui]?.[ui]||ui)}</span><span><strong>${esc(t('Text language'))}:</strong> ${esc(lang)}</span><span>${esc(t(kind))}</span>${title?`<p><strong>${esc(t('Edition'))}:</strong> ${esc(title)}</p>`:''}<details><summary>${esc(t('Edition and reading context'))}</summary><p>${esc(t('Changing the interface language does not translate the selected text.'))}</p></details></aside>`;
 }
 root.AtlasSourceContext={textContext};if(typeof module!=='undefined')module.exports={textContext,rows};
})(typeof window!=='undefined'?window:globalThis);
