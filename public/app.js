const dialog = document.querySelector('#rsvpDialog');
const form = document.querySelector('#rsvpForm');
const message = document.querySelector('#formMessage');

async function loadEvent() {
  const response = await fetch('/api/event');
  const event = await response.json();
  document.title = `${event.title} | RSVP`;
  document.querySelector('#eventTitle').textContent = event.title;
  document.querySelector('#eventDate').textContent = event.date;
  document.querySelector('#eventDescription').textContent = event.description;
  document.querySelector('#eventHero').style.backgroundImage = `linear-gradient(90deg, rgba(8, 11, 16, .88), rgba(8, 11, 16, .32)), url("${event.image}")`;
  document.querySelector('#locationName').textContent = event.locationName;
  document.querySelector('#mapDescription').textContent = event.mapDescription;
  document.querySelector('#locationImage').src = event.locationImage;
  for (const link of document.querySelectorAll('#mapsLink, #locationImageLink')) link.href = event.mapsUrl;
  document.querySelector('#startName').textContent = event.startName;
  document.querySelector('#startAddress').textContent = event.startAddress;
  document.querySelector('#startMapsLink').href = event.startMapsUrl;
  document.querySelector('#destinationName').textContent = event.destinationName;
  document.querySelector('#destinationAddress').textContent = event.destinationAddress;
  document.querySelector('#destinationMapsLink').href = event.destinationMapsUrl;
  document.querySelector('#modalTitle').textContent = event.title;
  document.querySelector('#modalDescription').textContent = event.description;
  if (event.showcaseItems.length) {
    document.querySelector('#carsSection').hidden = false;
    document.querySelector('#carGrid').innerHTML = event.showcaseItems.map((item) => `<article><img class="car-logo" src="${escapeAttribute(item.image_src)}" alt="${escapeAttribute(item.title)} logo"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join('');
  }
}
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

document.querySelector('#openRsvp').addEventListener('click', () => dialog.showModal());
document.querySelector('#openRsvpFinal').addEventListener('click', () => dialog.showModal());
document.querySelector('#closeRsvp').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
form.addEventListener('submit', async (event) => {
  event.preventDefault(); message.textContent = 'Sending…';
  const data = new FormData(form);
  const response = await fetch('/api/rsvps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attending: data.get('attending') === 'yes', fullName: data.get('fullName'), carMakeModel: data.get('carMakeModel') }) });
  const result = await response.json();
  message.textContent = result.message || result.error;
  if (response.ok) { form.reset(); setTimeout(() => dialog.close(), 1300); }
});
loadEvent().catch(() => { document.querySelector('#eventTitle').textContent = 'Event details are unavailable.'; });
