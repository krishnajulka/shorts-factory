// Story format. A story file (stories/<id>.json) is a StorySpec; the pipeline
// adds voiceover timings to make a RenderStory. See STORY_GUIDE.md.

export type Mood = "happy" | "sad" | "angry" | "shock" | "smug";
export type Species = "pigeon" | "cat" | "frog" | "bean";
export type Setting = "city" | "forest" | "space" | "room" | "beach";
export type Light = "day" | "dusk" | "night" | "danger" | "gold";
export type Action =
  | "idle"
  | "run"
  | "jump"
  | "bow"
  | "shake"
  | "spin"
  | "grow"
  | "enter"
  | "exit"
  | "float"
  | "faint";
export type Effect = "rays" | "rain" | "speed" | "vignette" | "confetti" | "shake" | "snow";
export type Sfx =
  | "vineBoom"
  | "recordScratch"
  | "animeWow"
  | "yippee"
  | "bruh"
  | "omgHellNah"
  | "dramaticBoomer"
  | "illuminatiConfirmed"
  | "wilhelmScream"
  | "spongebobFail"
  | "loadingLag"
  | "ohMyGodVine";

// Either a drawn species or any emoji as the character.
export type Character = { species: Species; color?: string; name?: string } | { emoji: string; name?: string };

// Things that happen when a spoken word is said (word = lowercase, letters only).
export type Change = { at: string; mood?: Mood; hold?: string | null; hat?: string | null };

export type ActorSpec = {
  who: string; // key into story.cast
  x: number; // 0..1080 across the stage
  toX?: number; // walks/runs to here by the time of `at` (or scene end)
  size?: number; // 1 = normal (~220px tall)
  lift?: number; // px above the ground, e.g. standing on a car
  face?: "left" | "right";
  mood?: Mood;
  hold?: string; // "fry" or an emoji held in the mouth/hand
  hat?: string; // "crown" or an emoji worn on the head
  action?: Action;
  at?: string; // word that triggers the action
  changes?: Change[];
};

export type SceneSpec = {
  id: string;
  text: string; // narration, 8-18 words
  setting: Setting;
  light: Light;
  focus?: string; // cast key the camera's close-ups frame
  actors: ActorSpec[];
  crowd?: { who: string; count: number; mood?: Mood; until?: string };
  effects?: Effect[];
  drop?: { at: string; emoji: string; to: string }; // falls onto an actor
  burst?: { at: string; emoji: string }; // explodes into many copies
  flash?: string; // white flash on this word
  stickers?: { word: string; emoji: string }[];
  sfx?: Sfx;
};

export type StorySpec = {
  id: string;
  title: string;
  youtube: { title: string; description: string; tags: string[] };
  logline?: string; // required for new stories: the whole story in 1-2 plain sentences
  comment?: string; // required for new stories: question posted as a comment after upload
  hook?: string; // required for new stories (validator); on-screen text for the first ~3s, e.g. "WHO IS KNOCKING? 🚪"
  narrator?: "brian" | "george" | "jessica" | "liam" | "callum"; // ElevenLabs voice
  voice: string; // Windows fallback voice
  rate: number; // Windows fallback speed
  keywords: string[];
  // Bottom-half loop; omitted = picked from the story id.
  bottom?: "soap" | "stack" | "dominoes" | "rings" | "plinko" | "race" | "breakout" | "spiral" | "territory" | "wheel" | "corner";
  racers?: string[]; // emoji for bottom "race" (2-5) or "wheel" (3-8)
  cast: Record<string, Character>;
  scenes: SceneSpec[];
};

export type TimedWord = { word: string; start: number };
export type RenderScene = SceneSpec & { file: string; duration: number; words: TimedWord[] };
export type RenderStory = Omit<StorySpec, "scenes"> & { scenes: RenderScene[] };
