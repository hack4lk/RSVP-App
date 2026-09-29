async function loadRsvps() {
  const response = await fetch('/api/admin/rsvps');
  if (!response.ok) return;
  const rsvps = await response.json();
  const yes = rsvps.filter((r) => r.attending).length;
  document.querySelector('#summary').textContent = `${yes} attending · ${rsvps.length} total responses`;
  document.querySelector('#rsvpRows').innerHTML = rsvps.map((r) => `<tr><td>${escapeHtml(r.full_name)}</td><td><span class="badge ${r.attending ? 'yes' : 'no'}">${r.attending ? 'Yes' : 'No'}</span></td><td>${escapeHtml(r.car_make_model)}</td><td>${new Date(r.created_at).toLocaleString()}</td><td><button class="remove-button" data-id="${r.id}" data-type="rsvp" title="Delete this RSVP">Remove</button></td></tr>`).join('') || '<tr><td colspan="5">No RSVPs yet.</td></tr>';
}
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
loadRsvps();

const showcaseForm = document.querySelector('#showcaseForm');
const showcaseMessage = document.querySelector('#showcaseMessage');
const showcaseItems = document.querySelector('#showcaseItems');
const logoPreview = document.querySelector('#logoPreview');
const logoPreviewImage = document.querySelector('#logoPreviewImage');
function previewLogo(source) { logoPreviewImage.src = source; logoPreview.hidden = !source; }
showcaseForm.imageFile.addEventListener('change', () => {
  const file = showcaseForm.imageFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => previewLogo(reader.result);
  reader.readAsDataURL(file);
});
showcaseForm.imageUrl.addEventListener('input', () => { if (!showcaseForm.imageFile.files[0]) previewLogo(showcaseForm.imageUrl.value); });
async function loadShowcaseItems() {
  const response = await fetch('/api/admin/showcase-items');
  if (!response.ok) return;
  const items = await response.json();
  showcaseItems.innerHTML = items.map((item) => `<article><img src="${escapeHtml(item.image_src)}" alt=""><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p></div><button data-id="${item.id}" class="remove-button">Remove</button></article>`).join('') || '<p>No logo rows yet.</p>';
}
showcaseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showcaseMessage.textContent = 'Saving…';
  const file = showcaseForm.imageFile.files[0];
  if (file && file.size > 3_500_000) { showcaseMessage.textContent = 'Please use an image smaller than 3.5 MB.'; return; }
  const imageSrc = file ? await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }) : showcaseForm.imageUrl.value;
  const response = await fetch('/api/admin/showcase-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageSrc, title: showcaseForm.title.value, description: showcaseForm.description.value }) });
  const result = await response.json();
  showcaseMessage.textContent = response.ok ? 'Logo added.' : result.error;
  if (response.ok) { showcaseForm.reset(); logoPreview.hidden = true; loadShowcaseItems(); }
});
showcaseItems.addEventListener('click', async (event) => { if (!event.target.matches('.remove-button')) return; await fetch(`/api/admin/showcase-items/${event.target.dataset.id}`, { method: 'DELETE' }); loadShowcaseItems(); });
loadShowcaseItems();

// Handle RSVP row deletions
document.querySelector('#rsvpRows').addEventListener('click', async (event) => {
  if (!event.target.matches('.remove-button[data-type="rsvp"]')) return;
  if (!confirm('Are you sure you want to delete this RSVP?')) return;
  await fetch(`/api/admin/rsvps/${event.target.dataset.id}`, { method: 'DELETE' });
  loadRsvps();
});
