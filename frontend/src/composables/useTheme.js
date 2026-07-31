import { ref } from 'vue';

const currentTheme = ref(localStorage.getItem('app-theme') || 'dark');

// Apply the theme to the HTML element
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme !== 'dark') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
};

// Initialize immediately
applyTheme(currentTheme.value);

export function useTheme() {
  const themes = [
    { id: 'dark', name: '波普黄黑 (Pop Yellow)', color: '#fde047' },
    { id: 'work', name: '极简黑白 (Black & White)', color: '#ffffff' },
    { id: 'sunny', name: '荧光青绿 (Lime Cyan)', color: '#bef264' },
    { id: 'cute', name: '波普芭比粉 (Barbie Pink)', color: '#ffb6d9' },
  ];

  const setTheme = (themeId) => {
    currentTheme.value = themeId;
    localStorage.setItem('app-theme', themeId);
    applyTheme(themeId);
  };

  return {
    currentTheme,
    themes,
    setTheme
  };
}
