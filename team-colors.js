/* ============================================================
   TEAM COLORS — one primary per school
   ------------------------------------------------------------
   Every school the site can name, and the colour to paint a solid
   block of it in. Shared by all three leagues, like script.js and
   week-core.js — a school's colour is a fact about the school, not
   about a dynasty.

   WHY THIS ISN'T THE `color` FIELD IN league-data.js
   Those exist and are deliberately different. A roster `color` is
   an ACCENT: it sits as a 3px bar or a thin ring against a dark
   panel, so several of them are brightened away from the school's
   real shade to stay visible at that size. Painting a whole box in
   a colour chosen to be readable as a hairline gives you a box that
   glows. This table is the opposite job — the true primary, chosen
   to be a background — so the two can't be merged without one of
   them getting worse.

   Where both exist, a filled surface uses this table and a hairline
   accent uses the roster colour. Where only the roster colour exists
   (the 1-star dynasty's invented schools, which have no real primary
   because they aren't real schools), that's the fallback.

   ONE COLOUR PER SCHOOL, NOT TWO. Text colour is computed from the
   fill's luminance at render time rather than stored, because a
   stored pair can disagree with itself and this can't: a light fill
   always gets dark ink and a dark fill always gets light ink, with
   no row to get wrong. Schools whose identity is "black and gold"
   are entered as the black — gold reads as a highlight, not a
   surface, and a wall of gold boxes is unreadable.

   ACCURACY
   These are the schools' published primaries as best known, but
   they are transcribed, not sourced from a feed, so treat them the
   way espnId values are treated in league-data.js: probably right,
   worth eyeballing. Getting one wrong is cosmetic and safe to fix —
   nothing computes from these.

   ADDING A SCHOOL
   Add it to TEAM_COLORS under the same spelling the rest of the site
   uses (check OPPONENT_ESPN_IDS in script.js). If the site refers to
   it by more than one spelling, add the extra ones to TEAM_COLOR_ALIASES
   rather than duplicating the hex — one hex per school means one place
   to fix it.
   ============================================================ */
const TEAM_COLORS = {
  /* --- SEC --- */
  "Alabama": "#9E1B32",
  "Arkansas": "#9D2235",
  "Auburn": "#0C2340",
  "Florida": "#0021A5",
  "Georgia": "#BA0C2F",
  "Kentucky": "#0033A0",
  "LSU": "#461D7C",
  "Mississippi State": "#5D1725",
  "Missouri": "#000000",
  "Ole Miss": "#14213D",
  "Oklahoma": "#841617",
  "South Carolina": "#73000A",
  "Tennessee": "#FF8200",
  "Texas": "#BF5700",
  "Texas A&M": "#500000",
  "Vanderbilt": "#000000",

  /* --- Big Ten --- */
  "Illinois": "#13294B",
  "Indiana": "#990000",
  "Iowa": "#000000",
  "Maryland": "#E03A3E",
  "Michigan": "#00274C",
  "Michigan State": "#18453B",
  "Minnesota": "#7A0019",
  "Nebraska": "#E41C38",
  "Northwestern": "#4E2A84",
  "Ohio State": "#BB0000",
  "Oregon": "#154733",
  "Penn State": "#041E42",
  "Purdue": "#000000",
  "Rutgers": "#CC0033",
  "UCLA": "#2D68C4",
  "USC": "#990000",
  "Washington": "#4B2E83",
  "Wisconsin": "#C5050C",

  /* --- ACC --- */
  "Boston College": "#98002E",
  "Cal": "#003262",
  "Clemson": "#F56600",
  "Duke": "#003087",
  "Florida State": "#782F40",
  "Georgia Tech": "#003057",
  "Louisville": "#AD0000",
  "Miami": "#F47321",
  "NC State": "#CC0000",
  "North Carolina": "#4B9CD3",
  "Pittsburgh": "#003594",
  "SMU": "#C8102E",
  "Stanford": "#8C1515",
  "Syracuse": "#F76900",
  "Virginia": "#232D4B",
  "Virginia Tech": "#630031",
  "Wake Forest": "#000000",

  /* --- Big 12 --- */
  "Arizona": "#AB0520",
  "Arizona State": "#8C1D40",
  "Baylor": "#154734",
  "BYU": "#002E5D",
  "Cincinnati": "#E00122",
  "Colorado": "#CFB87C",
  "Houston": "#C8102E",
  "Iowa State": "#C8102E",
  "Kansas": "#0051BA",
  "Kansas State": "#512888",
  "Oklahoma State": "#FF7300",
  "TCU": "#4D1979",
  "Texas Tech": "#CC0000",
  "UCF": "#000000",
  "Utah": "#CC0000",
  "West Virginia": "#002855",

  /* --- Independents / Pac --- */
  "Notre Dame": "#0C2340",
  "Navy": "#00205B",
  "UConn": "#000E2F",
  "Washington State": "#981E32",
  "Oregon State": "#DC4405",

  /* --- American --- */
  "Army": "#000000",
  "Charlotte": "#046A38",
  "East Carolina": "#592A8A",
  "Florida Atlantic": "#003366",
  "Memphis": "#003087",
  "North Texas": "#00853E",
  "Rice": "#00205B",
  "Temple": "#9D2235",
  "Tulane": "#006747",
  "Tulsa": "#002D72",
  "UAB": "#1E6B52",
  "USF": "#006747",
  "UTSA": "#0C2340",

  /* --- Mountain West --- */
  "Air Force": "#003087",
  "Boise State": "#0033A0",
  "Colorado State": "#1E4D2B",
  "Fresno State": "#C41230",
  "Hawai'i": "#024731",
  "Nevada": "#003366",
  "New Mexico": "#BA0C2F",
  "San Diego State": "#A6192E",
  "San Jose State": "#0055A2",
  "UNLV": "#CF0A2C",
  "Utah State": "#00263A",
  "Wyoming": "#492F24",

  /* --- Sun Belt --- */
  "Appalachian State": "#000000",
  "Arkansas State": "#CC092F",
  "Coastal Carolina": "#006F71",
  "Georgia Southern": "#011E41",
  "Georgia State": "#0039A6",
  "James Madison": "#450084",
  "Louisiana": "#CE181E",
  "Marshall": "#00B140",
  "Old Dominion": "#003057",
  "South Alabama": "#00205B",
  "Southern Mississippi": "#000000",
  "Texas State": "#501214",
  "Troy": "#8A2432",
  "UL Monroe": "#840029",

  /* --- Conference USA --- */
  "Delaware": "#00539F",
  "Jacksonville State": "#CC0000",
  "Kennesaw State": "#000000",
  "Liberty": "#002D62",
  "Louisiana Tech": "#002F8B",
  "Middle Tennessee": "#0066CC",
  "Missouri State": "#5E0009",
  "New Mexico State": "#8C0B42",
  "Sam Houston": "#F56600",
  "UTEP": "#041E42",
  "Western Kentucky": "#B01E24",

  /* --- MAC --- */
  "Akron": "#041E42",
  "Ball State": "#BA0C2F",
  "Bowling Green": "#4F2C1D",
  "Buffalo": "#005BBB",
  "Central Michigan": "#6A0032",
  "Eastern Michigan": "#046A38",
  "Kent State": "#002664",
  "Miami University": "#C41230",
  "Northern Illinois": "#CC0000",
  "Ohio": "#00694E",
  "Toledo": "#15397F",
  "Western Michigan": "#6C4023",

  /* --- FCS and others the schedules reach --- */
  "North Dakota State": "#009A44",
  "Sacramento State": "#043927",
  "UMass": "#881C1C",
};

/* Alternate spellings the site uses for a school already above.
   Aliases, not duplicate rows, so a colour is only ever stored once.
   Some of these are the site's own shorthand ("FSU"), some are the
   in-game poll's abbreviations ("Mississippi St", "W. Kentucky"). */
const TEAM_COLOR_ALIASES = {
  "California": "Cal",
  "FSU": "Florida State",
  "C. Michigan": "Central Michigan",
  "W. Michigan": "Western Michigan",
  "W. Kentucky": "Western Kentucky",
  "Ga Southern": "Georgia Southern",
  "FLA Atlantic": "Florida Atlantic",
  "Mississippi St": "Mississippi State",
  "New Mexico St.": "New Mexico State",
  "San Diego St.": "San Diego State",
  "Washington St.": "Washington State",
  "Miami (OH)": "Miami University",
  "Southern Miss": "Southern Mississippi",
  "Hawaii": "Hawai'i",
  "Pitt": "Pittsburgh",
  "Ol Miss": "Ole Miss",
};
