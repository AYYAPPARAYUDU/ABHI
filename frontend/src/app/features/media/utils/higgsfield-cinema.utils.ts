/**
 * Open-Higgsfield-AI Cinematography Definitions & Prompt Compiler
 * Direct TypeScript port from Autom8AI/Open-Higgsfield-AI (MIT License)
 */

export const CAMERA_MAP: Record<string, string> = {
  'Modular 8K Digital': 'modular 8K digital cinema camera',
  'Full-Frame Cine Digital': 'full-frame digital cinema camera',
  'Grand Format 70mm Film': 'grand format 70mm film camera',
  'Studio Digital S35': 'Super 35 studio digital camera',
  'Classic 16mm Film': 'classic 16mm film camera',
  'Premium Large Format Digital': 'premium large-format digital cinema camera'
};

export const LENS_MAP: Record<string, string> = {
  'Creative Tilt Lens': 'creative tilt lens effect',
  'Compact Anamorphic': 'compact anamorphic lens',
  'Extreme Macro': 'extreme macro lens',
  '70s Cinema Prime': '1970s cinema prime lens',
  'Classic Anamorphic': 'classic anamorphic lens',
  'Premium Modern Prime': 'premium modern prime lens',
  'Warm Cinema Prime': 'warm-toned cinema prime lens',
  'Swirl Bokeh Portrait': 'swirl bokeh portrait lens',
  'Vintage Prime': 'vintage prime lens',
  'Halation Diffusion': 'halation diffusion filter',
  'Clinical Sharp Prime': 'ultra-sharp clinical prime lens'
};

export const FOCAL_PERSPECTIVE: Record<number, string> = {
  8: 'ultra-wide perspective',
  14: 'wide-angle perspective',
  24: 'wide-angle dynamic perspective',
  35: 'natural cinematic perspective',
  50: 'standard portrait perspective',
  85: 'classic portrait perspective'
};

export const APERTURE_EFFECT: Record<string, string> = {
  'f/1.4': 'shallow depth of field, creamy bokeh',
  'f/4': 'balanced depth of field',
  'f/11': 'deep focus clarity, sharp foreground to background'
};

export const CINEMA_ASSET_URLS: Record<string, string> = {
  // Cameras
  'Modular 8K Digital': 'assets/cinema/modular_8k_digital.webp',
  'Full-Frame Cine Digital': 'assets/cinema/full_frame_cine_digital.webp',
  'Grand Format 70mm Film': 'assets/cinema/grand_format_70mm_film.webp',
  'Studio Digital S35': 'assets/cinema/studio_digital_s35.webp',
  'Classic 16mm Film': 'assets/cinema/classic_16mm_film.webp',
  'Premium Large Format Digital': 'assets/cinema/premium_large_format_digital.webp',

  // Lenses
  'Creative Tilt Lens': 'assets/cinema/creative_tilt_lens.webp',
  'Compact Anamorphic': 'assets/cinema/compact_anamorphic.webp',
  'Extreme Macro': 'assets/cinema/extreme_macro.webp',
  '70s Cinema Prime': 'assets/cinema/70s_cinema_prime.webp',
  'Classic Anamorphic': 'assets/cinema/classic_anamorphic.webp',
  'Premium Modern Prime': 'assets/cinema/premium_modern_prime.webp',
  'Warm Cinema Prime': 'assets/cinema/warm_cinema_prime.webp',
  'Swirl Bokeh Portrait': 'assets/cinema/swirl_bokeh_portrait.webp',
  'Vintage Prime': 'assets/cinema/vintage_prime.webp',
  'Halation Diffusion': 'assets/cinema/halation_diffusion.webp',
  'Clinical Sharp Prime': 'assets/cinema/clinical_sharp_prime.webp',

  // Aperture
  'f/1.4': 'assets/cinema/f_1_4.webp',
  'f/4': 'assets/cinema/f_4.webp',
  'f/11': 'assets/cinema/f_11.webp'
};

export const QUICK_PROMPTS = [
  { label: 'Portrait', prompt: 'Professional portrait photograph, shallow depth of field, soft studio lighting, 85mm lens' },
  { label: 'Landscape', prompt: 'Breathtaking landscape photograph, golden hour, wide angle, dramatic clouds, 4K' },
  { label: 'Product', prompt: 'Commercial product photography, clean white background, studio lighting, professional' },
  { label: 'Fantasy', prompt: 'Epic fantasy scene, magical atmosphere, volumetric lighting, highly detailed, concept art' },
  { label: 'Sci-Fi', prompt: 'Futuristic sci-fi environment, neon lights, cyberpunk city, rain reflections, cinematic' },
  { label: 'Food', prompt: 'Professional food photography, appetizing, warm lighting, shallow depth of field, editorial' },
  { label: 'Architecture', prompt: 'Architectural photography, dramatic angles, clean lines, modern design, professional' },
  { label: 'Fashion', prompt: 'High fashion editorial, avant-garde styling, studio lighting, Vogue aesthetic, professional' }
];

export function buildNanoBananaPrompt(
  basePrompt: string,
  camera: string,
  lens: string,
  focalLength: number,
  aperture: string
): string {
  const cameraDesc = CAMERA_MAP[camera] || camera;
  const lensDesc = LENS_MAP[lens] || lens;
  const perspective = FOCAL_PERSPECTIVE[focalLength] || '';
  const depthEffect = APERTURE_EFFECT[aperture] || '';

  const qualityTags = [
    'professional photography',
    'ultra-detailed',
    '8K resolution'
  ];

  const parts = [
    basePrompt,
    `shot on a ${cameraDesc}`,
    `using a ${lensDesc} at ${focalLength}mm ${perspective ? `(${perspective})` : ''}`,
    `aperture ${aperture}`,
    depthEffect,
    'cinematic lighting',
    'natural color science',
    'high dynamic range',
    qualityTags.join(', ')
  ];

  return parts.filter((p) => p && p.trim() !== '').join(', ');
}
