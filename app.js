import { CLIENT_ID, CLIENT_SECRET, STREAMERS } from './config.js';

const API          = 'https://api.twitch.tv/helix';
const gallery      = document.getElementById('gallery');
const viewer       = document.getElementById('viewer');
const stream       = document.getElementById('stream');
const chat         = document.getElementById('chat');
const back         = document.getElementById('back');
const toggleChat   = document.getElementById('toggle-chat');
const chatWrapper  = document.getElementById('chat-wrapper');
const addContainer = document.getElementById('add-container');
const addInput     = document.getElementById('add-input');
const addButton    = document.getElementById('add-button');

let chatVisible  = true;
let custom       = JSON.parse(localStorage.getItem('customStreamers') || '[]');
let allStreamers = [...STREAMERS, ...custom];

// Chat ein-/ausblenden
toggleChat.addEventListener('click', () => {
  chatVisible = !chatVisible;
  chatWrapper.classList.toggle('collapsed', !chatVisible);
});

// Zurück zur Galerie
back.addEventListener('click', () => {
  viewer.classList.add('hidden');
  gallery.style.display = 'grid';
  stream.src = ''; chat.src = '';
  addContainer.classList.remove('hidden');
});

// Streamer hinzufügen
addButton.addEventListener('click', () => {
  const name = addInput.value.trim().toLowerCase();
  if (name && !allStreamers.includes(name)) {
    allStreamers.push(name);
    custom.push(name);
    localStorage.setItem('customStreamers', JSON.stringify(custom));
    refreshGallery();
  }
  addInput.value = '';
});

// Player öffnen
function showStream(channel) {
  const parent = window.location.hostname;
  addContainer.classList.add('hidden');
  gallery.style.display = 'none';
  viewer.classList.remove('hidden');
  stream.src = `https://player.twitch.tv/?channel=${channel}&parent=${parent}&autoplay=true`;
  chat.src   = `https://www.twitch.tv/embed/${channel}/chat?parent=${parent}&darkpopout`;
  chatWrapper.classList.toggle('collapsed', !chatVisible);
}

// App-Token holen
async function getAppToken() {
  const res  = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}` +
    `&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  return (await res.json()).access_token;
}

// Live-Streams abrufen
async function getLiveStreams(token) {
  let results = [];
  for (let i = 0; i < allStreamers.length; i += 100) {
    const batch  = allStreamers.slice(i, i + 100);
    const params = batch.map(u => `user_login=${u}`).join('&');
    const res    = await fetch(`${API}/streams?${params}`, {
      headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}` }
    });
    const json   = await res.json();
    results       = results.concat(json.data);
  }
  return results;
}

// Karte erstellen (mit Remove-Button)
function createCard(s) {
  const div = document.createElement('div');
  div.className = 'card';

  // Remove-Button
  const remove = document.createElement('button');
  remove.className = 'remove-btn';
  remove.textContent = '–';
  remove.addEventListener('click', e => {
    e.stopPropagation(); // damit nicht gleichzeitig showStream feuert

    // Aus allStreamers entfernen
    const idx = allStreamers.indexOf(s.user_login);
    if (idx > -1) allStreamers.splice(idx, 1);

    // Aus custom entfernen und in localStorage speichern
    const cidx = custom.indexOf(s.user_login);
    if (cidx > -1) {
      custom.splice(cidx, 1);
      localStorage.setItem('customStreamers', JSON.stringify(custom));
    }

    // Galerie neu rendern
    refreshGallery();
  });

  // Thumbnail + Info einfügen
  const thumb = s.thumbnail_url
    .replace('{width}', '320')
    .replace('{height}', '180');

  div.innerHTML = `
    <img src="${thumb}" alt="Thumbnail"/>
    <div class="info">
      <strong>${s.user_name}</strong><br/>
      ${s.viewer_count} Zuschauer
      <span class="title">${s.title}</span>
    </div>
  `;

  // Button ans DOM anhängen (muss nach innerHTML kommen)
  div.appendChild(remove);

  // Klick auf Card öffnet Stream
  div.addEventListener('click', () => showStream(s.user_login));

  gallery.appendChild(div);
}

// Galerie neu laden
async function refreshGallery() {
  const token = await getAppToken();
  const live  = await getLiveStreams(token);
  gallery.innerHTML = '';
  if (!live.length) {
    gallery.innerHTML = '<p>Niemand ist gerade live.</p>';
  } else {
    live.forEach(createCard);
  }
}

// Starte App
(async () => {
  await refreshGallery();
})();
