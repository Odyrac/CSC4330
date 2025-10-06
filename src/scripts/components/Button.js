function createButton(label, icon, onClick, container = document.body, size = 'normal') {
  const button = document.createElement('button');
  button.className = `button-container ${size === 'small' && 'button-container-small'}`;
  button.innerHTML = `<img src="src/assets/icons/${icon}.png" alt="${label} icon" class="button-icon ${label && 'button-icon-left'} ${size === 'small' && 'button-icon-small'}"> ${label}`;
  button.onclick = onClick;
  container.appendChild(button);
  return button;
}