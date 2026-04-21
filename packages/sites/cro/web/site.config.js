/**
 * Croatian site configuration.
 * This is the only file that differs between installations.
 * Fork this file (and the public/ assets) to create a new country site.
 */
const siteConfig = {
  // Branding
  logo:        null,
  logoAlt:     null,
  societyUrl:  'https://www.rodoslovlje.hr',
  indexUrl:    null,
  contactEmail: 'todo@rodoslovlje.hr',

  apiHost: 'indeks-api.rodoslovlje.hr',

  // Languages shown in the dropdown, ordered alphabetically by language name
  languages: ['de', 'en', 'hr', 'hu', 'it', 'sl'],

  // Preferred language when no saved preference or browser match is found
  defaultLang: 'hr',

  // Per-language overrides: site title and society name
  i18n: {
    en: { site_title: 'Croatian Genealogical Index',      society_name: 'Croatian Genealogy Society “Pavao Ritter Vitezović”' },
    sl: { site_title: 'Hrvaški rodoslovni indeks',        society_name: 'Hrvaško rodoslovno društvo “Pavao Ritter Vitezović”' },
    hr: { site_title: 'Hrvatski rodoslovni indeks',       society_name: 'Hrvatsko rodoslovno društvo “Pavao Ritter Vitezović”' },
    hu: { site_title: 'Horvát Genealógiai Index',         society_name: '”Pavao Ritter Vitezović” Horvát Genealógiai Társaság' },
    de: { site_title: 'Kroatischer Genealogischer Index', society_name: 'Kroatische Genealogische Gesellschaft “Pavao Ritter Vitezović”' },
    it: { site_title: 'Indice genealogico croato',        society_name: 'Società genealogica croata “Pavao Ritter Vitezović”' },
  },

  // Intro paragraphs shown on empty search tabs. Falls back to 'en' for missing languages.
  // Each entry: { text: string (HTML allowed), warning?: true }
  intro: {
    en: [
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '', warning: true },
      { text: '' },
    ],
    sl: [
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '', warning: true },
      { text: '' },
    ],
    hr: [
      { text: '<strong>Hrvatski rodoslovni indeks</strong> arhivska je zbirka podataka o rođenima, vjenčanima i umrlima u Hrvatskoj, koja nastaje iz zbirki pojedinih rodoslovaca od samih početaka rada društva. U njoj možemo tražiti imena i prezimena osoba koje istražujemo kako bismo saznali je li ih netko drugi već otkrio i opisao. Osnovni indeks sadrži, osim osobnih imena, datume i mjesta rođenja, vjenčanja i smrti te prezime davatelja podataka, što istraživaču omogućuje daljnji kontakt, naznačuje smjer i često uopće omogućuje istraživanje u posredno otkrivenom župnom arhivu. Kontaktni podaci davatelja nisu objavljeni, ali do njih neće biti teško doći putem <a href="https://www.rodoslovje.hr" target="_blank" rel="noopener">Hrvatskog rodoslovnog društva</a>.' },
      { text: 'Glavni kartica <strong>Pretraga</strong> vraća rezultate upita iz svih dijelova zbirke: rođenih, vjenčanih i umrlih povijesnih osoba u Hrvatskoj. Tražilica omogućuje točnu ili približnu pretragu po svim poljima, kao i pretragu samo zapisa s poveznicom na izvorne dokumente (na <a href="https://www.familysearch.org/en/search/collection/2040054" target="_blank" rel="noopener">Croatia, Church Books, 1516-1994</a> na FamilySearch.org (trebate se prijaviti, besplatno)).' },
      { text: 'Dodatne kartice <strong>Rođenje</strong>, <strong>Obitelj</strong> i <strong>Smrt</strong> omogućuju pretragu po pojedinoj vrsti zapisa. Dostupna su sva polja: ime, prezime, datum i mjesto događaja te prezime rodoslovca-davatelja podataka.' },
      { text: 'Indeks obitelji uključuje i roditelje koji se nikada nisu vjenčali ili čak nikada nisu živjeli zajedno, što može biti dragocjena informacija za potomke ili osobe koje traže podatke. Za svaku obitelj vidljiv je i broj djece. Iza broja skriva se popis dječjih imena s godinom rođenja (gdje taj podatak postoji).' },
      { text: 'Rezultati upita mogu se sortirati po bilo kojem stupcu. Za potpuni pregled, prozor za pretragu može se sakriti. Moguć je izvoz rezultata u obliku CSV datoteke. Za strane korisnike indeksa stranica je dostupna i na engleskom.' },
      { text: 'Popis prezimena, imena, datuma i mjesta rođenja, vjenčanja i smrti napravljen je iz objedinjene datoteke u koju su rezultate svoga rada pridonijeli brojni rodoslovci navedeni na stranici <a href="?t=contributors">Suradnici</a>.' },
      { text: 'Upozorenje! Hrvatski rodoslovni indeks isključivo je informativnog karaktera. Hrvatsko rodoslovno društvo odriče se svake odgovornosti za točnost dostavljenih podataka. Društvo je dobrovoljno udruženje pojedinaca koji razvijaju zajednički izvor poznavanja podataka iz matičnih knjiga i drugih pisanih i usmenih izvora. Struktura društva omogućuje svakome tko ima vlastitu zbirku rodoslovnih podataka da je pridonese zajedničkoj kumulativnoj zbirci i indeksu. Za točnost podataka ne može jamčiti ni jedan pojedinac koji je pridonio podatke u indeks, kao ni Hrvatsko rodoslovno društvo.', warning: true },
      { text: 'Ako imate vlastito obiteljsko stablo u obliku baze podataka i željeli biste se pridružiti postojećim suradnicima s rezultatima svojega rada, pošaljite svoju GEDCOM datoteku (bez podataka o živim osobama) <a href="mailto:todo@rodoslovje.hr">e-poštom</a> administratoru.' },
    ],
    hu: [
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '', warning: true },
      { text: '' },
    ],
    de: [
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '', warning: true },
      { text: '' },
    ],
    it: [
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '', warning: true },
      { text: '' },
    ],
  },
};

export default siteConfig;
