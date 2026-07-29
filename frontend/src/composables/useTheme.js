import { ref, watch } from 'vue';

const currentTheme = ref(localStorage.getItem('app-theme') || 'dark');

// Apply the theme to the HTML element
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'light') {
    // Optionally remove any dark mode specific global classes if using Tailwind dark: mode
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
};

// Initialize immediately
applyTheme(currentTheme.value);

export function useTheme() {
  const themes = [
    { id: 'dark', name: '深空灰 (Dark)', color: '#0f172a' },
    { id: 'light', name: '月光白 (Light)', color: '#f8fafc' },
    { id: 'ocean', name: '深海蓝 (Ocean)', color: '#083344' },
    { id: 'violet', name: '莫兰迪紫 (Violet)', color: '#2e1065' },
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
