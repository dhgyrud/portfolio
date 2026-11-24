const stage = document.querySelector('main');
const screens = [...stage.querySelectorAll('.screen')];
const phone = matchMedia('(max-width: 767px), (pointer: coarse) and (max-height: 500px) and (max-width: 950px)');
let active;
let transition;

function displayPage(duration = 0) {
  const layout = phone.matches ? 'mobile' : 'desktop';
  const page = location.hash.slice(1) || 'home';
  const next = document.getElementById(layout + '-' + page) || document.getElementById(layout + '-home');
  const width = Number(next.dataset.width);
  const height = Number(next.dataset.height);
  const scale = phone.matches ? innerWidth / width : Math.min(innerWidth / width, innerHeight / height);
  stage.style.left = (phone.matches ? 0 : (innerWidth - width * scale) / 2) + 'px';
  stage.style.top = (phone.matches ? 0 : (innerHeight - height * scale) / 2) + 'px';
  stage.style.width = width + 'px';
  stage.style.height = (phone.matches ? innerHeight / scale : height) + 'px';
  stage.style.setProperty('--scale', scale);
  const gutter = phone.matches ? 0 : Math.max(0, (innerWidth / scale - width) / 2);
  stage.style.setProperty('--desktop-gutter', gutter + 'px');
  stage.style.setProperty('--sidebar-inset', (33 / scale) + 'px');
  if (next === active) return;
  transition?.cancel();
  for (const screen of screens) screen.classList.remove('leaving', 'current');
  if (active) {
    active.querySelectorAll('video').forEach(video => video.pause());
    active.querySelectorAll('.chosen').forEach(card => card.classList.remove('chosen'));
  }
  const previous = active;
  active = next;
  active.classList.add('current');
  for (const image of active.querySelectorAll('img[data-src]')) {
    image.src = image.dataset.src;
    image.removeAttribute('data-src');
  }
  active.querySelectorAll('.tv-gallery video').forEach(video => { video.muted = true; video.play().catch(() => {}); });
  active.scrollTop = 0;
  active.querySelectorAll('.scroll').forEach(area => area.scrollTo(0, 0));
  if (duration && previous && previous.dataset.layout === layout) {
    previous.classList.add('leaving');
    transition = next.animate([{opacity: 0}, {opacity: 1}], {duration: duration * 1000, easing: 'ease-out'});
    transition.onfinish = () => previous.classList.remove('leaving');
  }
}
stage.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  const opensWork = link.closest('.screen')?.dataset.page === 'works' &&
    ['#packit', '#wordspan', '#sundaze', '#tvchosun'].includes(link.hash);
  if (!opensWork && link.classList.contains('tap-swap') && !link.classList.contains('chosen')) {
    active.querySelectorAll('.chosen').forEach(card => card.classList.remove('chosen'));
    link.classList.add('chosen');
    return;
  }
  // Show the mobile TV thumbnail's pressed state before navigating.
  if (link.matches('#mobile-works .tv-works-card')) {
    if (link.classList.contains('tv-pressed')) return;
    link.classList.add('tv-pressed');
    setTimeout(() => {
      link.classList.remove('tv-pressed');
      if (active !== link.closest('.screen')) return;
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      displayPage(0);
    }, 140);
    return;
  }
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  displayPage(opensWork ? 0 : Number(link.dataset.duration));
});
addEventListener('hashchange', () => displayPage());
addEventListener('resize', () => displayPage());
displayPage();
for (const area of document.querySelectorAll('.scroll-x')) {
  let start;
  let dragged = false;
  area.addEventListener('pointerdown', event => {
    dragged = false;
    if (event.pointerType === 'mouse' && event.button === 0) start = {x:event.clientX, left:area.scrollLeft};
  });
  area.addEventListener('pointermove', event => {
    if (!start || !(event.buttons & 1)) { start = null; return; }
    const dx = event.clientX - start.x;
    if (!dragged && Math.abs(dx) < 5) return;
    dragged = true;
    area.setPointerCapture(event.pointerId);
    area.scrollLeft = start.left - dx / Number(stage.style.getPropertyValue('--scale'));
  });
  area.addEventListener('pointerup', () => { start = null; });
  area.addEventListener('pointercancel', () => { start = null; });
  area.addEventListener('click', event => {
    if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
  }, true);
}

const dragLink = document.querySelector('.n953-1036');
let dragOrigin;
dragLink.addEventListener('pointerdown', event => {
  dragOrigin = [event.clientX, event.clientY];
  dragLink.setPointerCapture(event.pointerId);
});
dragLink.addEventListener('pointerup', event => {
  if (dragOrigin && Math.hypot(event.clientX - dragOrigin[0], event.clientY - dragOrigin[1]) > 8) dragLink.click();
  dragOrigin = null;
});
dragLink.addEventListener('pointercancel', () => { dragOrigin = null; });
const viewer = document.createElement('dialog');
viewer.className = 'art-viewer';
viewer.setAttribute('aria-label', '작품 확대 보기');
document.body.append(viewer);
let selectedArt;
function fitArtwork() {
  if (!viewer.open || !selectedArt) return;
  const factor = Math.min(viewer.clientWidth * .96 / selectedArt.offsetWidth, viewer.clientHeight * .96 / selectedArt.offsetHeight);
  viewer.firstElementChild.style.setProperty('--art-scale', factor);
}
function openArtwork(art) {
  const origin = art.getBoundingClientRect();
  selectedArt = art;
  const copy = art.cloneNode(true);
  copy.removeAttribute('tabindex');
  copy.removeAttribute('role');
  copy.removeAttribute('data-enlarge');
  for (const property of ['left', 'top', 'transform']) copy.style.removeProperty(property);
  copy.classList.add('expanded-art');
  viewer.replaceChildren(copy);
  viewer.showModal();
  copy.querySelectorAll('video').forEach(video => { video.muted = true; video.currentTime = art.querySelector('video')?.currentTime || 0; video.play().catch(() => {}); });
  fitArtwork();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && origin.width && origin.height) {
    const end = copy.getBoundingClientRect();
    const dx = origin.left + origin.width / 2 - end.left - end.width / 2;
    const dy = origin.top + origin.height / 2 - end.top - end.height / 2;
    const fromScale = origin.width / selectedArt.offsetWidth;
    const toScale = copy.style.getPropertyValue('--art-scale');
    copy.animate([
      {transform:'translate(-50%, -50%) translate(' + dx + 'px,' + dy + 'px) scale(' + fromScale + ')'},
      {transform:'translate(-50%, -50%) scale(' + toScale + ')'}
    ], {duration:320, easing:'cubic-bezier(.22,.75,.25,1)'});
  }
}
viewer.addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => {
  viewer.replaceChildren();
  selectedArt = null;
});
addEventListener('resize', fitArtwork);
addEventListener('hashchange', () => { if (viewer.open) viewer.close(); });
for (const screen of screens) {
  const page = screen.dataset.page;
  if (!['packit','sundaze','wordspan','tvchosun'].includes(page)) continue;
  const gallery = [...screen.children].find(layer => layer.querySelector('img'));
  if (!gallery) continue;
  let items;
  if (page === 'tvchosun') items = [...gallery.querySelectorAll('.tv-art')];
  else if (page === 'sundaze') items = [...gallery.children].filter(layer => layer.querySelector('img'));
  else items = [...gallery.querySelectorAll('.image-clip')].map(clip => clip.parentElement);
  items.forEach((art, index) => {
    art.dataset.enlarge = '';
    art.tabIndex = 0;
    art.setAttribute('role','button');
    art.setAttribute('aria-haspopup','dialog');
    art.setAttribute('aria-label',page + ' 작품 ' + (index + 1) + ' 확대');
    art.addEventListener('click', () => openArtwork(art));
    art.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openArtwork(art);
      }
    });
  });
}
