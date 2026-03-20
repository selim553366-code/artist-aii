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
  top: 'shortHairShortFlat',
  face: 'default',
  accessories: 'blank',
  clothing: 'shirtCrewNeck',
  facialHair: 'blank',
  shoes: 'default',
  brand: 'none'
};

export const generateCompositeAvatar = async (uid: string, config: AvatarConfig): Promise<string> => {
  const params = new URLSearchParams();
  params.append('seed', uid);
  if (config.top) params.append('top', config.top);
  if (config.face) {
    params.append('mouth', config.face);
    params.append('eyes', config.face);
  }
  if (config.accessories) params.append('accessories', config.accessories);
  if (config.clothing) params.append('clothing', config.clothing);
  if (config.facialHair) params.append('facialHair', config.facialHair);
  
  const url = `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
  
  try {
    const res = await fetch(url);
    let svgText = await res.text();
    
    // Change viewBox and height to accommodate legs
    svgText = svgText.replace('viewBox="0 0 264 280"', 'viewBox="0 0 264 400"');
    svgText = svgText.replace(/height="280"/g, 'height="400"');
    
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
    const nikeSecret = (import.meta as any).env.VITE_NIKE_SECRET;
    const gucciSecret = (import.meta as any).env.VITE_GUCCI_SECRET;

    if (config.brand === 'nike') {
      if (nikeSecret) {
        brandSvg = `<image href="${nikeSecret}" x="100" y="200" width="60" height="30" />`;
      } else {
        brandSvg = `<path d="M 110 210 Q 130 230 150 200 Q 135 215 110 210 Z" fill="#ffffff" stroke="#000000" stroke-width="1"/>`;
      }
    } else if (config.brand === 'gucci') {
      if (gucciSecret) {
        brandSvg = `<image href="${gucciSecret}" x="100" y="200" width="60" height="30" />`;
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
