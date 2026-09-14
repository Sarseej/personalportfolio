export const latent = {
  night: '#05070D', navy: '#08111F', slate: '#101B2D', glass: '#15243B',
  lunar: '#8FB6FF', cyan: '#65E6FF', violet: '#7774FF', lamp: '#FFB36B',
  paper: '#E8E7E1', silver: '#AEB8C8', dim: '#8490A3', bright: '#F4F7FB',
  yawDegrees: 1.5, pitchDegrees: 0.8, flightMs: 840,
} as const;
// Material aliases keep the established furniture resources reusable.
export const studioMaterials = {
  eggshell: latent.night, parchment: latent.paper, cream: latent.slate,
  sand: latent.navy, taupe: '#394254', gray: latent.dim, espresso: '#242B36',
  ink: latent.night, olive: latent.cyan, sage: '#354354', glass: latent.glass,
  woodGrain: [73, 48, 36], stoneGrain: [22, 27, 37],
} as const;
