// Base de la PokéAPI usada para todas las peticiones REST.
const API_BASE = "https://pokeapi.co/api/v2";

const searchForm = document.getElementById("search-form");
const pokemonInput = document.getElementById("pokemon-input");
const statusBox = document.getElementById("status");
const pokemonCard = document.getElementById("pokemon-card");
const fireButton = document.getElementById("fire-btn");
const fireGrid = document.getElementById("fire-grid");

// Helpers de formato.
const capitalize = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);
const typeClass = (type = "") => `type-${type.toLowerCase().replace(/[^a-z0-9-]/g, "") || "normal"}`;

// Devuelve la imagen oficial del Pokémon. Si falta, usa un sprite de respaldo.
const getSprite = (pokemon) =>
  pokemon?.sprites?.other?.["official-artwork"]?.front_default ||
  pokemon?.sprites?.front_default ||
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png";

// Muestra mensajes de estado (info/ok/error) en la barra de notificación.
const setStatus = (message = "", tone = "info") => {
  if (!message) {
    statusBox.classList.remove("visible");
    statusBox.textContent = "";
    return;
  }
  statusBox.textContent = message;
  statusBox.dataset.tone = tone;
  statusBox.classList.add("visible");
};

// --- Peticiones a la PokéAPI ---
// Busca un Pokémon específico por nombre o ID.
// Endpoint: GET https://pokeapi.co/api/v2/pokemon/{id|name}
const getPokemon = async (name) => {
  const response = await fetch(`${API_BASE}/pokemon/${encodeURIComponent(name.toLowerCase())}`);
  if (!response.ok) {
    throw new Error("not-found");
  }
  return response.json();
};

// --- Render de resultados individuales ---
const renderSingle = (pokemon) => {
  if (!pokemon) {
    pokemonCard.className = "card single-card empty";
    pokemonCard.innerHTML = '<p class="placeholder">No se encontró el Pokémon solicitado.</p>';
    return;
  }

  // Chips de tipos e info básica.
  const types = pokemon.types
    .map((entry) => `<span class="pill ${typeClass(entry.type.name)}">${capitalize(entry.type.name)}</span>`)
    .join("");

  // Solo se muestran dos habilidades para mantener la tarjeta compacta.
  const abilities = pokemon.abilities
    .slice(0, 2)
    .map((item) => capitalize(item.ability.name))
    .join(", ");

  const primaryType = pokemon.types?.[0]?.type?.name || "normal";
  pokemonCard.className = `card single-card ${typeClass(primaryType)}`;
  pokemonCard.innerHTML = `
    <div class="card-header">
      <div class="pill">#${pokemon.id}</div>
      <div class="types">${types}</div>
    </div>
    <div class="sprite">
      <img src="${getSprite(pokemon)}" alt="${capitalize(pokemon.name)}" loading="lazy">
    </div>
    <h3 class="name">${capitalize(pokemon.name)}</h3>
    <div class="meta">
      <div><span>Altura</span>${(pokemon.height / 10).toFixed(1)} m</div>
      <div><span>Peso</span>${(pokemon.weight / 10).toFixed(1)} kg</div>
      <div><span>Base XP</span>${pokemon.base_experience}</div>
      <div><span>Habilidades</span>${abilities || "N/D"}</div>
    </div>
  `;
};

// --- Render de la grilla de Pokémon de tipo Hada ---
const renderFireGrid = (list) => {
  if (!list.length) {
    fireGrid.innerHTML = '<p class="placeholder">No se pudieron cargar los Pokémon de tipo Hada.</p>';
    return;
  }

  // Renderiza cada Pokémon de de tipo Ada con su tipo principal como clase para colorear la card.
  fireGrid.innerHTML = list
    .map(
      (pokemon) => `
        <article class="card ${typeClass(pokemon.types?.[0]?.type?.name || "normal")}">
          <div class="card-header">
            <div class="pill">#${pokemon.id}</div>
            <div class="types">
              ${pokemon.types
                .map((entry) => `<span class="pill ${typeClass(entry.type.name)}">${capitalize(entry.type.name)}</span>`)
                .join("")}
            </div>
          </div>
          <div class="sprite">
            <img src="${getSprite(pokemon)}" alt="${capitalize(pokemon.name)}" loading="lazy">
          </div>
          <h3 class="name">${capitalize(pokemon.name)}</h3>
        </article>
      `
    )
    .join("");
};

// --- Controlador de búsqueda individual (formulario) ---
const handleSearch = async (event) => {
  event.preventDefault();
  const query = pokemonInput.value.trim();

  if (!query) {
    setStatus("Ingresa el nombre o el ID de un Pokémon para buscar.", "error");
    renderSingle(null);
    return;
  }

  setStatus(`Buscando a ${query}...`, "info");
  try {
    // Llamada directa a la PokéAPI para un recurso individual (nombre o ID).
    const pokemon = await getPokemon(query);
    renderSingle(pokemon);
    setStatus(`${capitalize(query)} encontrado.`, "ok");
  } catch (error) {
    renderSingle(null);
    setStatus("No pudimos encontrar ese Pokémon. Porfavor querido usuario ingrese otro nombre.", "error");
  }
};

// --- Controlador que carga todos los Pokémon de tipo Hada ---
const handleFire = async () => {
  fireButton.disabled = true;
  fireGrid.innerHTML = '<p class="placeholder">Cargando lista...</p>';
  setStatus("Cargando todos los Pokémon de tipo Hada...", "info");

  try {
    // Paso 1: obtener la lista de Pokémon de tipo Hada.
    // Endpoint: GET https://pokeapi.co/api/v2/type/fire -> devuelve nombres/URLs.
    const response = await fetch(`${API_BASE}/type/fairy`);
    if (!response.ok) {
      throw new Error("type-fetch-failed");
    }

    const { pokemon } = await response.json();
    const names = pokemon.map((entry) => entry.pokemon.name);

    // Paso 2: pedir en paralelo el detalle de cada Pokémon (Promise.allSettled evita que un fallo detenga la lista).
    const detailResults = await Promise.allSettled(names.map((name) => getPokemon(name)));
    const firePokemons = detailResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .sort((a, b) => a.id - b.id);

    renderFireGrid(firePokemons);
    setStatus(`Listo: ${firePokemons.length} Pokémon de tipo Hada.`, "ok");
  } catch (error) {
    fireGrid.innerHTML = '<p class="placeholder">No se pudo consultar la PokéAPI ahora.</p>';
    setStatus("No se pudieron cargar los Pokémon de tipo Hada. Intenta nuevamente.", "error");
  } finally {
    fireButton.disabled = false;
  }
};
 
searchForm?.addEventListener("submit", handleSearch);
fireButton?.addEventListener("click", handleFire);
 
