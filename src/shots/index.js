// Registers every set and builds the full shot list + sound cue list.
import { GlobeSet } from '../assets/globe.js';
import { CitySet } from '../assets/city.js';
import { RegionMapSet } from '../assets/regionmap.js';
import { GeoBlockSet } from '../assets/geoblock.js';
import { MacroSet } from '../assets/macro.js';
import { InteriorSet } from '../assets/interior.js';
import { SyriaSet } from '../assets/syria.js';
import { NukeSet } from '../assets/nukes.js';
import { LabSet } from '../assets/lab.js';
import { IstanbulSet } from '../assets/istanbul.js';
import { PlatesSet } from '../assets/plates.js';
import { resetCursor } from '../timing.js';
import { createDSL } from './dsl.js';
import { act1 } from './act1.js';
import { act3 } from './act3.js';
import { act4 } from './act4.js';
import { act5 } from './act5.js';
import { act6 } from './act6.js';
import { act7 } from './act7.js';

export let CUES = [];
export function registerAll(d) {
  d.addSet('globe', new GlobeSet());
  d.addSet('city', new CitySet());
  d.addSet('map', new RegionMapSet());
  d.addSet('block', new GeoBlockSet());
  d.addSet('macro', new MacroSet());
  d.addSet('room', new InteriorSet());
  d.addSet('syria', new SyriaSet());
  d.addSet('nukes', new NukeSet());
  d.addSet('lab', new LabSet());
  d.addSet('istanbul', new IstanbulSet());
  d.addSet('plates', new PlatesSet());
  resetCursor();
  const D = createDSL(d);
  for (const act of [act1, act3, act4, act5, act6, act7]) act(D);
  CUES = D.cues.sort((a, b) => a.t - b.t);
  d.cues = CUES;
  return D.shots;
}
