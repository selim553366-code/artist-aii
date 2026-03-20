export interface AvatarConfig {
  top: string;
  face: string;
  accessories: string;
  clothing: string;
  facialHair: string;
  shoes: string;
  brand: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  top: 'shortFlat',
  face: 'default',
  accessories: 'blank',
  clothing: 'shirtCrewNeck',
  facialHair: 'blank',
  shoes: 'default',
  brand: 'none'
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
    if (config.shoes === 'nike') {
      shoesSvg = `
        <path d="M 85 370 Q 85 350 115 350 L 125 350 L 125 390 L 95 390 Q 85 390 85 370 Z" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
        <path d="M 90 365 Q 105 380 120 360 Q 110 365 90 365 Z" fill="#000000"/>
        <path d="M 135 370 Q 135 350 165 350 L 175 350 L 175 390 L 145 390 Q 135 390 135 370 Z" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
        <path d="M 140 365 Q 155 380 170 360 Q 160 365 140 365 Z" fill="#000000"/>
      `;
    } else if (config.shoes === 'gucci') {
      shoesSvg = `
        <rect x="85" y="360" width="40" height="30" rx="8" fill="#171717" />
        <rect x="85" y="370" width="40" height="6" fill="#15803d" />
        <rect x="85" y="372" width="40" height="2" fill="#b91c1c" />
        <rect x="135" y="360" width="40" height="30" rx="8" fill="#171717" />
        <rect x="135" y="370" width="40" height="6" fill="#15803d" />
        <rect x="135" y="372" width="40" height="2" fill="#b91c1c" />
      `;
    } else {
      shoesSvg = `
        <rect x="90" y="360" width="30" height="30" rx="10" fill="#374151" />
        <rect x="140" y="360" width="30" height="30" rx="10" fill="#374151" />
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
    }

    const injection = `
      <g id="custom-lower-body">
        <rect x="95" y="240" width="25" height="140" fill="#1e3a8a" />
        <rect x="145" y="240" width="25" height="140" fill="#1e3a8a" />
        ${shoesSvg}
        ${brandSvg}
      </g>
    </svg>`;
    
    svgText = svgText.replace('</svg>', injection);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  } catch (e) {
    return url;
  }
};
