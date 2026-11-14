// What a person can DO from each "First 48 hours" item.
// - Store buttons open a search for the exact official app name in the App Store /
//   Google Play, so no app id is guessed.
// - Websites are the providers' well-known official domains. They were added by the
//   AI at the owner's request and are NOT yet checked by a person: the app shows
//   "Not yet checked by a person" until `reviewedBy`/`reviewedOn` are filled.
// - Maps actions open Google Maps near the person's location (asked once, never stored).

export interface Provider {
  name: string; // official name, never translated
  appSearch: string | null; // exact name to search in the stores
  website: string | null;
}

export interface ChecklistAction {
  providers?: Provider[];
  maps?: { query: string; labelKey: string }[];
  reviewedBy: string | null;
  reviewedOn: string | null;
}

export const checklistActions: Record<string, ChecklistAction> = {
  sim: {
    providers: [
      { name: 'e& (Etisalat)', appSearch: 'e& UAE', website: 'https://www.etisalat.ae' },
      { name: 'du', appSearch: 'du UAE', website: 'https://www.du.ae' },
      { name: 'Virgin Mobile UAE', appSearch: 'Virgin Mobile UAE', website: 'https://www.virginmobile.ae' },
    ],
    reviewedBy: null, reviewedOn: null,
  },
  uaepass: {
    providers: [{ name: 'UAE PASS', appSearch: 'UAE PASS', website: 'https://uaepass.ae' }],
    reviewedBy: null, reviewedOn: null,
  },
  transport: {
    providers: [
      { name: 'nol Pay', appSearch: 'nol Pay', website: null },
      { name: 'RTA Dubai', appSearch: 'RTA Dubai', website: 'https://www.rta.ae' },
      { name: 'Careem', appSearch: 'Careem', website: null },
    ],
    reviewedBy: null, reviewedOn: null,
  },
  groceries: {
    providers: [
      { name: 'talabat', appSearch: 'talabat', website: null },
      { name: 'Carrefour UAE', appSearch: 'Carrefour UAE', website: null },
      { name: 'noon', appSearch: 'noon shopping', website: null },
    ],
    reviewedBy: null, reviewedOn: null,
  },
  doctor: {
    maps: [
      { query: 'clinic', labelKey: 'actions.nearClinics' },
      { query: 'pharmacy', labelKey: 'actions.nearPharmacies' },
      { query: 'hospital', labelKey: 'actions.nearHospitals' },
    ],
    reviewedBy: null, reviewedOn: null,
  },
  utilities: {
    providers: [
      { name: 'DEWA (Dubai)', appSearch: 'DEWA', website: 'https://www.dewa.gov.ae' },
      { name: 'SEWA (Sharjah)', appSearch: 'SEWA', website: null },
      { name: 'TAMM (Abu Dhabi)', appSearch: 'TAMM Abu Dhabi', website: 'https://www.tamm.abudhabi' },
    ],
    reviewedBy: null, reviewedOn: null,
  },
  schools: {
    providers: [
      { name: 'KHDA (Dubai)', appSearch: null, website: 'https://www.khda.gov.ae' },
      { name: 'ADEK (Abu Dhabi)', appSearch: null, website: 'https://www.adek.gov.ae' },
    ],
    maps: [{ query: 'school', labelKey: 'actions.nearSchools' }],
    reviewedBy: null, reviewedOn: null,
  },
};
