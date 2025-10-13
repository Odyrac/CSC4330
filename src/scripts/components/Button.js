function createButton(label, icon, onClick, container = document.body, size = 'normal') {
  const button = document.createElement('button');
  button.className = `button-container ${size === 'small' ? 'button-container-small' : ''}`;

  const iconImg = document.createElement('img');
  iconImg.src = `src/assets/icons/${icon}.png`;
  iconImg.alt = `${label} icon`;
  iconImg.className = `button-icon ${label ? 'button-icon-left' : ''} ${size === 'small' ? 'button-icon-small' : ''}`;

  button.appendChild(iconImg);

  if (label) {
    const textSpan = document.createElement('span');
    textSpan.textContent = label;
    textSpan.style.position = 'relative';
    textSpan.style.zIndex = '1';
    button.appendChild(textSpan);
  }

  button.onclick = onClick;
  container.appendChild(button);
  return button;
}