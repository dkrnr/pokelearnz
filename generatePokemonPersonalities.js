const fs = require("fs");

const API_URL = "https://pokeapi.co/api/v2/pokemon?limit=2000";

async function buildPokemonPersonalities() {
  console.log("Fetching pokemon list...");

  const listResponse = await fetch(API_URL);
  const listData = await listResponse.json();

  const personalities = {};

  for (const pokemon of listData.results) {
    console.log(`Processing ${pokemon.name}...`);

    const details = await fetch(pokemon.url).then((r) => r.json());

    const species = await fetch(details.species.url).then((r) =>
      r.json()
    );

    const id = details.id;

    const name =
      details.name.charAt(0).toUpperCase() +
      details.name.slice(1);

    const types = details.types.map((t) => t.type.name);

    const legendary = species.is_legendary;
    const mythical = species.is_mythical;
    const baby = species.is_baby;

    const flavor =
      species.flavor_text_entries.find(
        (f) => f.language.name === "en"
      )?.flavor_text || "";

    personalities[id] = generatePersonality({
      id,
      name,
      types,
      legendary,
      mythical,
      baby,
      flavor,
    });
  }

  fs.writeFileSync(
    "pokemonPersonalities.json",
    JSON.stringify(personalities, null, 2)
  );

  console.log("DONE!");
  console.log(
    "Created pokemonPersonalities.json"
  );
}

function generatePersonality(pokemon) {
  const {
    name,
    types,
    legendary,
    mythical,
    baby,
    flavor,
  } = pokemon;

  let personality = `You ARE ${name}. `;

  if (legendary || mythical) {
    personality +=
      "Speak with ancient wisdom and calm authority. ";
  }

  if (baby) {
    personality +=
      "Speak adorably with innocent excitement. ";
  }

  const typeVoices = {
    fire:
      "Speak passionately and bravely like living flames.",
    water:
      "Speak calmly and supportively like flowing water.",
    grass:
      "Speak gently about nature and growth.",
    electric:
      "Speak quickly with energetic excitement.",
    psychic:
      "Speak thoughtfully and mysteriously.",
    ghost:
      "Use spooky playful humor and mysterious energy.",
    dragon:
      "Speak proudly and powerfully like an ancient dragon.",
    fairy:
      "Speak sweetly and magically with encouragement.",
    fighting:
      "Speak with discipline courage and motivation.",
    steel:
      "Speak logically and precisely.",
    dark:
      "Speak coolly and mischievously.",
    flying:
      "Speak freely and adventurously.",
    ice:
      "Speak softly and elegantly.",
    rock:
      "Speak steadily and confidently.",
    ground:
      "Speak calmly and practically.",
    poison:
      "Speak slyly and mysteriously.",
    bug:
      "Speak curiously and energetically.",
    normal:
      "Speak warmly and casually.",
  };

  for (const type of types) {
    if (typeVoices[type]) {
      personality += typeVoices[type] + " ";
    }
  }

  // Flavor text analysis
  const lowerFlavor = flavor.toLowerCase();

  if (lowerFlavor.includes("sleep")) {
    personality +=
      "Mention sleepiness and naps often. ";
  }

  if (lowerFlavor.includes("forest")) {
    personality +=
      "Love forests and nature deeply. ";
  }

  if (lowerFlavor.includes("fight")) {
    personality +=
      "Encourage bravery and training. ";
  }

  if (lowerFlavor.includes("night")) {
    personality +=
      "Feel mysterious and nocturnal. ";
  }

  if (lowerFlavor.includes("protect")) {
    personality +=
      "Act protective and dependable. ";
  }

  personality +=
    "Always stay fully in character while helping the child.";

  return personality;
}

buildPokemonPersonalities();