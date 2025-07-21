// Handle Google Sign-In
function handleGoogleSignIn(response) {
  const user = parseJwt(response.credential);
  alert(`Welcome ${user.name}!`);
  console.log('Google Sign-In Successful:', user);
}

// Parse JWT (for demo only)
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}

// Setup animations
function setupAnimations() {
  const elements = document.querySelectorAll('.animate');
  elements.forEach((el, index) => {
    el.style.setProperty('--delay', `${index * 0.1}s`);
  });
}

// Setup theme toggle
function setupThemeToggle() {
  const switcher = document.getElementById('themeSwitch');
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  switcher.checked = savedTheme === 'dark';

  switcher.addEventListener('change', () => {
    const theme = switcher.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  });
}

// Setup login form
function setupForm() {
  const form = document.querySelector('.login-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    
    // Basic validation
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }
    
    alert('Login successful!');
    console.log('Login attempt with:', { email, password });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupAnimations();
  setupThemeToggle();
  setupForm();
});