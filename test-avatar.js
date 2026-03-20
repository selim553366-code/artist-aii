import fs from 'fs';

const config = {
  top: 'shortHairShortFlat',
  face: 'default',
  accessories: 'blank',
  clothing: 'shirtCrewNeck',
  facialHair: 'blank',
  shoes: 'default',
  brand: 'none'
};

async function generateCompositeAvatar(uid, config) {
  const params = new URLSearchParams();
  params.append('seed', uid);
  if (config.top) params.append('top', config.top);
  if (config.face && config.face !== 'default') {
    const mouthMap = {
      smile: 'smile',
      cry: 'sad',
      dizzy: 'grimace',
      rollEyes: 'disbelief',
      surprised: 'scream',
      wink: 'twinkle',
      winkWacky: 'tongue',
      squint: 'serious',
      sad: 'sad'
    };
    const eyesMap = {
      smile: 'happy',
      cry: 'cry',
      dizzy: 'dizzy',
      rollEyes: 'eyeRoll',
      surprised: 'surprised',
      wink: 'wink',
      winkWacky: 'winkWacky',
      squint: 'squint',
      sad: 'close'
    };
    if (mouthMap[config.face]) params.append('mouth', mouthMap[config.face]);
    if (eyesMap[config.face]) params.append('eyes', eyesMap[config.face]);
  }
  if (config.accessories) params.append('accessories', config.accessories);
  if (config.clothing) params.append('clothing', config.clothing);
  if (config.facialHair) params.append('facialHair', config.facialHair);
  
  const url = `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
  
  try {
    const res = await fetch(url);
    let svgText = await res.text();
    
    // Change viewBox and height to accommodate legs
    svgText = svgText.replace(/viewBox="[^"]+"/, 'viewBox="0 0 280 400"');
    svgText = svgText.replace(/height="[^"]+"/, 'height="400"');
    
    let shoesSvg = `
        <rect x="90" y="360" width="30" height="30" rx="10" fill="#374151" />
        <rect x="140" y="360" width="30" height="30" rx="10" fill="#374151" />
      `;

    let brandSvg = '';

    const injection = `
      <g id="custom-lower-body">
        <rect x="95" y="240" width="25" height="140" fill="#1e3a8a" />
        <rect x="145" y="240" width="25" height="140" fill="#1e3a8a" />
        ${shoesSvg}
        ${brandSvg}
      </g>
    </svg>`;
    
    svgText = svgText.replace('</svg>', injection);
    return svgText;
  } catch (e) {
    return url;
  }
}

generateCompositeAvatar('test', config).then(res => fs.writeFileSync('test.svg', res));
