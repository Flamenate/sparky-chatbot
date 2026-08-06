export const ASKED_FOR_HUMAN_RESPONSE = "ASKED FOR HUMAN";

export const companyInfo = {
  companyName: "Sparky",
  location: "Sakiet Ezzit, Sfax, Tunisie",
  phoneNumber: "+216 98 624 731",
  email: "sparkysolutionsphotovoltaique@gmail.com",
  website: null,
};

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
          "Combien est votre consommation électrique moyenne? Vous pouvez trouver cette information sur votre facture électrique en kWh.",
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

export const defaultIncreasePercent = 0.1;

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

export const conversationExamples: { role: string; content: string }[][] = [
  [
    { role: "user", content: "aslema" },
    { role: "assistant", content: "Marhba bik, kifeh nejmou n3awnouk?" },
    { role: "user", content: "n7b nrkb photolvoltaiq" },
    { role: "assistant", content: "Fi darek wala fi senya wala win bedhabt?" },
    { role: "user", content: "fi dari" },
    { role: "assistant", content: "Win tosken bedhabt?" },
    { role: "user", content: "gremda km 4 sfax" },
    {
      role: "assistant",
      content:
        "3andekchi fekra 3la 9adeh l consommation moyenne mte3ek en KwH?",
    },
    { role: "user", content: "mn3rch" },
    {
      role: "assistant",
      content: "Mouch mochkla. Tnajemchi t9olna 9adeh tjik l facture l3ada?",
    },
    { role: "user", content: "150" },
    {
      role: "assistant",
      content:
        "W tnajemchi t9olna chnouma les appareils (exemple: frigo, climatiseur) li 3andek fel dar?",
    },
    { role: "user", content: "3ndi 3 clim" },
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
      content: "Marhba bik! Tnajemchi t9olna win el senya bedhabt?",
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
      content:
        "Bienvenu. Pouvez vous indiquer si votre installation est pour une propriété agricole, résidentielle ou commerciale?",
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
