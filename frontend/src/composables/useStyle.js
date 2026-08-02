import { ref } from 'vue';

export const styles = [
  {
    id: 'geometric-bold',
    name: '几何大胆风',
    shortName: '大胆风',
    enName: 'Geometric Bold',
    docPath: 'Workbench/agent/大胆风格skill.md',
    description: '包豪斯构成主义，强烈的几何形状、4px纯黑粗边框、纯实色硬阴影与高对比黄黑色块',
    badgeColor: '#fde047',
    accentColor: '#ff006e',
    features: [
      '4px 纯黑粗边框 (border-4 border-black)',
      '100% 黑色硬阴影 (shadow-[4px_4px_0_0_#000])',
      '900 大写重字重标题 (font-black uppercase)',
      '波普黄黑/高饱和冲击配色 (yellow-200/pink)'
    ]
  },
  {
    id: 'neo-brutalist-soft',
    name: '柔和野兽派',
    shortName: '柔和风',
    enName: 'Neo-Brutalist Soft',
    docPath: 'Workbench/agent/柔和样式.md',
    description: '温和野兽派变体，2px细腻灰黑边框、15%透明度硬阴影与护眼马卡龙柔和配色',
    badgeColor: '#fbcfe8',
    accentColor: '#38bdf8',
    features: [
      '2px 灰黑边框 (border-2 border-gray-800)',
      '15% 透明度硬阴影 (rgba(0,0,0,0.15))',
      '700 柔和字重标题 (font-bold)',
      '马卡龙淡彩护眼配色 (pink-50/sky-200)'
    ]
  }
];

const getInitialStyle = () => {
  const saved = localStorage.getItem('app-style') || localStorage.getItem('app-theme');
  if (saved === 'neo-brutalist-soft' || saved === 'soft') return 'neo-brutalist-soft';
  return 'geometric-bold';
};

const currentStyle = ref(getInitialStyle());

const applyStyle = (styleId) => {
  const validStyle = styles.some(s => s.id === styleId) ? styleId : 'geometric-bold';
  currentStyle.value = validStyle;
  
  document.documentElement.setAttribute('data-style', validStyle);
  document.documentElement.setAttribute('data-theme', validStyle);

  if (validStyle === 'geometric-bold') {
    document.documentElement.classList.add('style-bold');
    document.documentElement.classList.remove('style-soft');
  } else {
    document.documentElement.classList.add('style-soft');
    document.documentElement.classList.remove('style-bold');
  }
};

// Initialize immediately
applyStyle(currentStyle.value);

export function useStyle() {
  const setStyle = (styleId) => {
    localStorage.setItem('app-style', styleId);
    applyStyle(styleId);
  };

  return {
    currentStyle,
    styles,
    setStyle
  };
}

// Alias export for backward compatibility
export function useTheme() {
  const { currentStyle, styles, setStyle } = useStyle();
  return {
    currentTheme: currentStyle,
    themes: styles.map(s => ({
      id: s.id,
      name: s.name,
      enName: s.enName,
      color: s.badgeColor,
      accent: s.accentColor,
      description: s.description
    })),
    setTheme: setStyle
  };
}
