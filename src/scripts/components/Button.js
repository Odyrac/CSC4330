function createButton(label, icon, onClick) {
  const button = document.createElement('button');
  button.className = 'button-container';
  button.innerHTML = `<img src="src/assets/icons/${icon}.png" alt="${label} icon" class="button-icon"> ${label}`;
  button.onclick = onClick;
  document.body.appendChild(button);
  return button;
}