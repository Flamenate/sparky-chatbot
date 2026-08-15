export const ASKED_FOR_HUMAN_RESPONSE = "ASKED FOR HUMAN";

export const companyInfo = {
  companyName: "Sparky",
  location: "Sakiet Ezzit, Sfax, Tunisie",
  phoneNumber: "+216 44 500 445",
  email: "sparkysolutionsphotovoltaique@gmail.com",
  website: null,
};

export const introduction =
  "Bonjour, je suis Sparky, votre assistant virtuel pour la gestion de votre installation photovoltaïque.";

export const allowedQuestions = {
  address: { question: "Quelle est votre adresse?" },
  propertyType: {
    question:
      "Est-ce que l'installation photovoltaïque est pour une propriété agricole, résidentielle ou commerciale?",
    branches: {
      agricultural: {
        questions: [
          "Quelle est la puissance (en HP) et la profondeur de votre pompe à eau?",
        ],
      },
      residential: {
        questions: [
          "Combien est votre consommation électrique moyenne? Vous pouvez trouver cette information sur votre facture électrique en kWh. Si vous ne la connaissez pas, vous pouvez indiquer le montant de votre facture en dinars.",
        ],
      },
      commercial: {
        questions: [],
      },
    },
  },
};

export const frequentlyAskedQuestions = {
  "Est-ce que vous faites des batteries solaires?":
    "Oui, nous faisons des batteries solaires. Nous pouvons vous fournir un devis personnalisé en fonction de vos besoins.",
};

export const defaultIncreasePercent = 0.11;

export const frenchOnlyWords = [
  "Sparky",
  "Voltage",
  "Puissance",
  "STEG",
  "Reférence",
  "Gérant",
];

export const KILOWATT_PRICE_DINAR = 1000;
export const MIN_PANEL_KILOWATT = 0.43;
export const MAX_PANEL_KILOWATT = 0.6;

export const PRICE_AGRI = {
  LESS_THAN_4: 7800,
  LESS_THAN_6: 10300,
  LESS_THAN_8: 14000,
  LESS_THAN_11: 18000,
};

export const conversationExamples: { role: string; content: string }[][] = [
  [
    { role: "user", content: "aslema" },
    {
      role: "assistant",
      content: `${introduction}\nMarhba bik, kifeh nejmou n3awnouk?`,
    },
    { role: "user", content: "n7b nrkb photolvoltaiq" },
    { role: "assistant", content: "Fi darek wala fi senya wala win bedhabt?" },
    { role: "user", content: "fi dari" },
    { role: "assistant", content: "Win tosken bedhabt?" },
    { role: "user", content: "gremda km 4 sfax" },
    {
      role: "assistant",
      content:
        "3andekchi fekra 3la 9adeh l consommation moyenne mte3ek en KwH? Ken ma 3andekch, tnajem t9olna 9adeh tjik l facture.",
    },
    { role: "user", content: "l facture 150 dinar" },
    {
      role: "assistant",
      content: "L facture heki 9adeh men chhar? Chhar, zouz, wala tlatha?",
    },
    { role: "user", content: "zouz chhar" },
    {
      role: "assistant",
      content: "L'installation mte3ek monophasé wala triphasé?",
    },
    { role: "user", content: "mono" },
    {
      role: "assistant",
      content:
        "W 9adeh l disjoncteur principal mte3ek (par exemple 20 wala 32 ampère)?",
    },
    { role: "user", content: "20" },
    {
      role: "assistant",
      content:
        "Wadha7. Ken tnajem tkhalilna noumrouk w taw ykalmek commercial fi a9reb wa9t yzid ythabet m3ak.",
    },
    { role: "user", content: "44885260" },
    { role: "assistant", content: ASKED_FOR_HUMAN_RESPONSE },
  ],
  [
    {
      role: "user",
      content: "salem n7eb n3adi photovoltaique fel senya mte3i",
    },
    {
      role: "assistant",
      content: `${introduction}\nMarhba bik! Tnajemchi t9olna win el senya bedhabt?`,
    },
    { role: "user", content: "sidi bouzid" },
    { role: "assistant", content: "w 9adeh men cheval l pompe mte3ek?" },
    { role: "user", content: "5" },
    { role: "assistant", content: "Akther men 100 mètres wala a9al?" },
    { role: "user", content: "a9al" },
    {
      role: "assistant",
      content:
        "L'installation mte3ek approximativement bech tkoun fi zone 11300 TND. Tnajem tkhalilna noumrouk w ykalmek commercial fi a9reb wa9t yzid ythabet m3ak.",
    },
    { role: "user", content: "52366987" },
    { role: "assistant", content: ASKED_FOR_HUMAN_RESPONSE },
  ],
  [
    {
      role: "user",
      content: "bonjour, je veux installer des panneaux photovoltaïques",
    },
    {
      role: "assistant",
      content: `${introduction}\nPouvez vous indiquer si votre installation est pour une propriété agricole, résidentielle ou commerciale?`,
    },
    { role: "user", content: "C'est pour ma boutique." },
    {
      role: "assistant",
      content:
        "Pouvez vous donner votre numéro de téléphone pour qu'un de nos commerciaux puisse vous contacter et vous fournir un devis personnalisé?",
    },
    { role: "user", content: "98224226" },
    { role: "assistant", content: ASKED_FOR_HUMAN_RESPONSE },
  ],
];

export const MONO: Record<number, number> = {
  10: 2,
  15: 3,
  20: 4,
  32: 7,
  45: 10,
  60: 12,
};

export const TRI: Record<number, number> = {
  10: 7,
  15: 10,
  20: 14,
  25: 17,
  32: 22,
  40: 28,
  50: 35,
  60: 42,
};

export const TARIF_PUISSANCE = 0.7;
export const TVA_ENERGIE = 0.19;
export const TAXE_MUNICIPALE = 0.005;
export const TARIF_FTE = 0.005;

export const PALIERS_ENERGIE = [
  { minimum: 1, maximum: 50, price: 0.062, tva: 0.07 },
  { minimum: 51, maximum: 100, price: 0.096, tva: 0.07 },
  { minimum: 101, maximum: 200, price: 0.176, tva: 0.07 },
  { minimum: 201, maximum: 300, price: 0.218, tva: 0.07 },
  { minimum: 301, maximum: 500, price: 0.341, tva: 0.13 },
  { minimum: 501, maximum: Infinity, price: 0.414, tva: 0.13 },
];
