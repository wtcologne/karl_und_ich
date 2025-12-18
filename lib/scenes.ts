/**
 * Scene definitions with short titles and full prompts
 */

export interface Scene {
  id: number;
  emoji: string;
  shortTitle: string;
  fullPrompt: string;
}

export const SCENES: Scene[] = [
  {
    id: 1,
    emoji: "🍕",
    shortTitle: "Pizza-Götter im Weltall",
    fullPrompt: "Der Nutzer und Karl der Kasten sitzen als riesige Götter auf einer schwimmenden Pizza im Weltall und streiten sich darum, ob Ananas darauf gehört, während Astronauten weinen."
  },
  {
    id: 2,
    emoji: "☕",
    shortTitle: "Barista & Latte-Art-Drache",
    fullPrompt: "Karl der Kasten ist ein grimmiger Barista in einem surrealen Café, während der Nutzer als Latte Art in Form eines Drachen aus der Kaffeetasse aufsteigt."
  },
  {
    id: 3,
    emoji: "🌵",
    shortTitle: "Cyberpunk-Wüste reiten",
    fullPrompt: "Der Nutzer reitet auf Karl dem Kasten wie auf einem störrischen Holzpferd durch eine neonfarbene Cyberpunk-Wüste voller tanzender Kakteen."
  },
  {
    id: 4,
    emoji: "♟️",
    shortTitle: "Schach mit Mini-Versionen",
    fullPrompt: "Karl der Kasten und der Nutzer spielen Schach, aber die Figuren sind kleine Versionen von ihnen selbst, die panisch vom Brett fliehen."
  },
  {
    id: 5,
    emoji: "🦆",
    shortTitle: "Gummientenregen im Smoking",
    fullPrompt: "Der Nutzer und Karl der Kasten stehen im Regen aus Gummienten, tragen Smoking, und diskutieren ernsthaft über Quantenphysik."
  },
  {
    id: 6,
    emoji: "🍣",
    shortTitle: "Sushi-Meister",
    fullPrompt: "Karl der Kasten ist ein grimmiger Sushi-Meister, während der Nutzer verzweifelt versucht, sich nicht selbst als Sushi rollen zu lassen."
  },
  {
    id: 7,
    emoji: "📺",
    shortTitle: "TV-News: Bananen-Untergang",
    fullPrompt: "Der Nutzer und Karl der Kasten sind Nachrichtensprecher in einer absurden TV-Show, die live über den Untergang einer Banane berichten."
  },
  {
    id: 8,
    emoji: "🏛️",
    shortTitle: "Tempel mit Popcorn-Opfergaben",
    fullPrompt: "Karl der Kasten als antiker Tempel, in dessen Innerem der Nutzer auf Rollschuhen Opfergaben aus Popcorn verteilt."
  },
  {
    id: 9,
    emoji: "🛁",
    shortTitle: "Badewanne voller Sterne",
    fullPrompt: "Der Nutzer und Karl der Kasten sitzen in einer Badewanne voller Sterne, planschen mit Galaxien und tragen lächerlich kleine Badehüte."
  },
  {
    id: 10,
    emoji: "🎧",
    shortTitle: "DJ & Tänzer auf Holz",
    fullPrompt: "Karl der Kasten ist ein grimmiger DJ, der Nutzer ein hyperaktiver Tänzer, während der Dancefloor aus wackelndem Holz besteht."
  },
  {
    id: 11,
    emoji: "🏓",
    shortTitle: "Tischtennis mit schreiendem Ei",
    fullPrompt: "Der Nutzer spielt Tischtennis gegen Karl den Kasten, aber der Ball ist ein schreiendes Ei und das Netz besteht aus Spaghetti."
  },
  {
    id: 12,
    emoji: "⚔️",
    shortTitle: "Ritter auf Staubsaugern",
    fullPrompt: "Karl der Kasten und der Nutzer sind mittelalterliche Ritter, die auf Staubsaugern in die Schlacht ziehen."
  },
  {
    id: 13,
    emoji: "🧘",
    shortTitle: "Mönche auf Legoberg",
    fullPrompt: "Der Nutzer und Karl der Kasten sitzen als philosophierende Mönche auf einem Berg aus Legosteinen."
  },
  {
    id: 14,
    emoji: "👶",
    shortTitle: "Babysitter & Business-Baby",
    fullPrompt: "Karl der Kasten als grimmiger Babysitter, der Nutzer ein riesiges Baby mit Anzug und Aktentasche."
  },
  {
    id: 15,
    emoji: "🍉",
    shortTitle: "Japanische Gameshow",
    fullPrompt: "Der Nutzer und Karl der Kasten in einer japanischen Gameshow, in der sie versuchen, einer riesigen rollenden Wassermelone zu entkommen."
  },
  {
    id: 16,
    emoji: "🧊",
    shortTitle: "Gedicht für den Kühlschrank",
    fullPrompt: "Karl der Kasten ist ein lebendiger Kühlschrank, der Nutzer versucht verzweifelt, ihm ein Gedicht vorzulesen."
  },
  {
    id: 17,
    emoji: "🕵️",
    shortTitle: "Film Noir Detektive",
    fullPrompt: "Der Nutzer und Karl der Kasten als Detektive in einem Film Noir, aber alles besteht aus Holz und Nebel."
  },
  {
    id: 18,
    emoji: "😇",
    shortTitle: "Engel vs Teufel auf Toast",
    fullPrompt: "Karl der Kasten als grimmiger Engel, der Nutzer als chaotischer Teufel auf einem Wolkenkratzer aus Toastbrot."
  },
  {
    id: 19,
    emoji: "🏐",
    shortTitle: "Beachvolleyball auf Zuckerwatte",
    fullPrompt: "Der Nutzer und Karl der Kasten spielen Beachvolleyball auf einem Strand aus Zuckerwatte, während Haie applaudieren."
  },
  {
    id: 20,
    emoji: "🌵",
    shortTitle: "Bewerbung beim Kaktus-Chef",
    fullPrompt: "Karl der Kasten und der Nutzer sitzen in einem absurden Bewerbungsgespräch – der Chef ist ein sprechender Kaktus."
  }
];

/**
 * Get a random scene
 */
export function getRandomScene(): Scene {
  const randomIndex = Math.floor(Math.random() * SCENES.length);
  return SCENES[randomIndex];
}

/**
 * Get scene by ID
 */
export function getSceneById(id: number): Scene | undefined {
  return SCENES.find(scene => scene.id === id);
}

