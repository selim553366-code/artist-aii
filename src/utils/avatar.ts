export interface AvatarConfig {
  top: string;
  face: string;
  accessories: string;
  clothing: string;
  clothingColor: string;
  facialHair: string;
  shoes: string;
  brand: string;
  customAccessory: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  top: 'shortFlat',
  face: 'default',
  accessories: 'blank',
  clothing: 'shirtCrewNeck',
  clothingColor: 'gray02',
  facialHair: 'blank',
  shoes: 'default',
  brand: 'none',
  customAccessory: 'none'
};

const fetchAndEmbedImage = async (url: string, x: number, y: number, width: number, height: number): Promise<string> => {
  if (!url) return '';
  try {
    if (url.startsWith('<svg')) {
      return `<g transform="translate(${x}, ${y}) scale(${width/100})">${url}</g>`;
    }
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('svg')) {
      const svgText = await res.text();
      // Simple scaling, assuming the SVG can scale or we just wrap it
      return `<g transform="translate(${x}, ${y}) scale(${width/100})">${svgText}</g>`;
    } else {
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      return `<image href="${base64}" x="${x}" y="${y}" width="${width}" height="${height}" />`;
    }
  } catch (e) {
    console.error('Failed to embed image:', e);
    return `<image href="${url}" x="${x}" y="${y}" width="${width}" height="${height}" />`;
  }
};

export const generateCompositeAvatar = async (uid: string, config: AvatarConfig): Promise<string> => {
  const params = new URLSearchParams();
  params.append('seed', uid);
  if (config.top && config.top !== 'blank') params.append('top', config.top);
  if (config.face && config.face !== 'default') {
    const mouthMap: Record<string, string> = {
      smile: 'smile',
      cry: 'sad',
      dizzy: 'grimace',
      rollEyes: 'disbelief',
      surprised: 'screamOpen',
      wink: 'twinkle',
      winkWacky: 'tongue',
      squint: 'serious',
      sad: 'sad'
    };
    const eyesMap: Record<string, string> = {
      smile: 'happy',
      cry: 'cry',
      dizzy: 'xDizzy',
      rollEyes: 'eyeRoll',
      surprised: 'surprised',
      wink: 'wink',
      winkWacky: 'winkWacky',
      squint: 'squint',
      sad: 'closed'
    };
    if (mouthMap[config.face]) params.append('mouth', mouthMap[config.face]);
    if (eyesMap[config.face]) params.append('eyes', eyesMap[config.face]);
  }
  if (config.accessories && config.accessories !== 'blank') params.append('accessories', config.accessories);
  if (config.clothing && config.clothing !== 'blank') params.append('clothing', config.clothing);
  if (config.clothingColor) params.append('clothingColor', config.clothingColor);
  if (config.facialHair && config.facialHair !== 'blank') params.append('facialHair', config.facialHair);
  
  const url = `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('DiceBear API error:', await res.text());
      return url;
    }
    let svgText = await res.text();
    
    // Change viewBox and height to accommodate legs
    svgText = svgText.replace(/viewBox="[^"]+"/, 'viewBox="0 0 280 400" width="280" height="400"');
    svgText = svgText.replace(/height="[^"]+"/, ''); // Remove existing height if any
    
    let shoesSvg = '';
    if (config.shoes === 'nikeDunkPanda') {
      shoesSvg = `
        <path d="M 85 370 Q 85 350 115 350 L 125 350 L 125 390 L 95 390 Q 85 390 85 370 Z" fill="#ffffff" stroke="#171717" stroke-width="2"/>
        <path d="M 85 370 Q 85 350 105 350 L 105 390 L 95 390 Q 85 390 85 370 Z" fill="#171717"/>
        <path d="M 90 365 Q 105 380 120 360 Q 110 365 90 365 Z" fill="#171717"/>
        <path d="M 135 370 Q 135 350 165 350 L 175 350 L 175 390 L 145 390 Q 135 390 135 370 Z" fill="#ffffff" stroke="#171717" stroke-width="2"/>
        <path d="M 135 370 Q 135 350 155 350 L 155 390 L 145 390 Q 135 390 135 370 Z" fill="#171717"/>
        <path d="M 140 365 Q 155 380 170 360 Q 160 365 140 365 Z" fill="#171717"/>
      `;
    } else if (config.shoes === 'gucci') {
      shoesSvg = `
        <rect x="85" y="360" width="40" height="30" rx="8" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
        <rect x="85" y="370" width="40" height="6" fill="#15803d" />
        <rect x="85" y="372" width="40" height="2" fill="#b91c1c" />
        <rect x="135" y="360" width="40" height="30" rx="8" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
        <rect x="135" y="370" width="40" height="6" fill="#15803d" />
        <rect x="135" y="372" width="40" height="2" fill="#b91c1c" />
      `;
    } else if (config.shoes === 'timberland') {
      shoesSvg = `
        <rect x="90" y="350" width="30" height="40" rx="5" fill="#d97706" stroke="#b45309" stroke-width="2" />
        <rect x="90" y="380" width="30" height="10" fill="#171717" />
        <rect x="140" y="350" width="30" height="40" rx="5" fill="#d97706" stroke="#b45309" stroke-width="2" />
        <rect x="140" y="380" width="30" height="10" fill="#171717" />
      `;
    } else if (config.shoes === 'sandals') {
      shoesSvg = `
        <path d="M 85 380 L 125 380 L 125 390 L 85 390 Z" fill="#78350f" />
        <path d="M 95 380 Q 105 360 115 380" fill="none" stroke="#78350f" stroke-width="4" />
        <path d="M 135 380 L 175 380 L 175 390 L 135 390 Z" fill="#78350f" />
        <path d="M 145 380 Q 155 360 165 380" fill="none" stroke="#78350f" stroke-width="4" />
      `;
    } else {
      shoesSvg = `
        <rect x="90" y="360" width="30" height="30" rx="10" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" />
        <rect x="140" y="360" width="30" height="30" rx="10" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" />
      `;
    }

    let brandSvg = '';
    const env = (import.meta as any).env || {};
    const nikeSecret = env.VITE_NIKE_SECRET;
    const gucciSecret = env.VITE_GUCCI_SECRET;

    if (config.brand === 'nike') {
      if (nikeSecret) {
        brandSvg = await fetchAndEmbedImage(nikeSecret, 110, 200, 60, 30);
      } else {
        brandSvg = `<path d="M 110 210 Q 130 230 150 200 Q 135 215 110 210 Z" fill="#ffffff" stroke="#000000" stroke-width="1"/>`;
      }
    } else if (config.brand === 'gucci') {
      if (gucciSecret) {
        brandSvg = await fetchAndEmbedImage(gucciSecret, 110, 200, 60, 30);
      } else {
        brandSvg = `
          <rect x="110" y="205" width="40" height="12" fill="#15803d" />
          <rect x="110" y="209" width="40" height="4" fill="#b91c1c" />
        `;
      }
    } else if (config.brand === 'fila') {
      brandSvg = `
        <rect x="115" y="205" width="30" height="20" fill="#1e3a8a" />
        <rect x="115" y="205" width="30" height="10" fill="#dc2626" />
        <text x="130" y="219" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">FILA</text>
      `;
    } else if (config.brand === 'adidas') {
      brandSvg = `
        <rect x="120" y="206" width="4" height="12" fill="#ffffff" transform="rotate(-20 122 212)" />
        <rect x="128" y="204" width="4" height="16" fill="#ffffff" transform="rotate(-20 130 212)" />
        <rect x="136" y="202" width="4" height="20" fill="#ffffff" transform="rotate(-20 138 212)" />
      `;
    } else if (config.brand === 'champion') {
      brandSvg = `
        <path d="M 135 205 A 10 10 0 1 0 135 225 A 10 10 0 0 0 135 205" fill="none" stroke="#dc2626" stroke-width="4" />
        <rect x="130" y="213" width="10" height="4" fill="#1e3a8a" />
      `;
    }

    let customAccSvg = '';
    if (config.customAccessory === 'gucciBelt') {
      customAccSvg = `
        <rect x="90" y="235" width="80" height="12" fill="#171717"/>
        <circle cx="130" cy="241" r="8" fill="#fbbf24"/>
        <circle cx="130" cy="241" r="5" fill="#171717"/>
      `;
    } else if (config.customAccessory === 'jordanNecklace') {
      customAccSvg = `
        <path d="M 115 170 L 130 200 L 145 170" fill="none" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="130" cy="205" r="6" fill="#fbbf24"/>
      `;
    } else if (config.customAccessory === 'nikeWristband') {
      customAccSvg = `
        <rect x="175" y="220" width="15" height="20" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" transform="rotate(15 182 230)" />
        <path d="M 178 228 Q 182 232 188 225 Q 185 228 178 228 Z" fill="#000000" transform="rotate(15 182 230)" />
      `;
    }

    const injection = `
      <g id="custom-lower-body">
        <rect x="95" y="240" width="25" height="140" fill="#3b82f6" />
        <rect x="145" y="240" width="25" height="140" fill="#3b82f6" />
        ${shoesSvg}
        ${brandSvg}
        ${customAccSvg}
      </g>
    </svg>`;
    
    svgText = svgText.replace('</svg>', injection);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  } catch (e) {
    return url;
  }
};
