'use strict';

/* =========================================================
   Mascotas. Todas usan las mismas clases para que las
   animaciones (voltereta, triste, cola…) funcionen igual:
   pet-tail, legs, pet-body, pet-head, ear-l, ear-r,
   eyes-open, eyes-closed, tongue, mouth, mouth-sad, tear
   ========================================================= */

const INK = '#2E2522';

function eyes(lx, rx, y, r, ink = INK) {
  return `
    <g class="eyes-open">
      <circle cx="${lx}" cy="${y}" r="${r}" fill="${ink}"/><circle cx="${lx + 3}" cy="${y - 3.5}" r="${r * .33}" fill="#fff"/>
      <circle cx="${rx}" cy="${y}" r="${r}" fill="${ink}"/><circle cx="${rx + 3}" cy="${y - 3.5}" r="${r * .33}" fill="#fff"/>
    </g>
    <g class="eyes-closed" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round">
      <path d="M${lx - 7} ${y + 2} Q${lx} ${y + 7} ${lx + 7} ${y + 2}"/><path d="M${rx - 7} ${y + 2} Q${rx} ${y + 7} ${rx + 7} ${y + 2}"/>
    </g>`;
}
const tear = (x, y) => `<path class="tear" d="M${x} ${y} q3.5 5.5 0 8.5 q-3.5 -3 0 -8.5z" fill="#9CC8F0"/>`;

const PETS = {
  chihuahua: {
    name: 'Chihuahua', the: 'el chihuahua', cheer: '¡Guau! 🐶', say: '¡Guau!',
    svg() {
      const fur = '#E8B886', furDark = '#D9A06A', light = '#F7DEC1', pink = '#F4A28C';
      return `<svg class="pet" viewBox="0 0 200 200" aria-hidden="true">
        <g class="pet-tail"><path d="M132 136 C150 132 162 116 153 98" stroke="${furDark}" stroke-width="9" fill="none" stroke-linecap="round"/></g>
        <g class="legs">
          <rect x="70" y="140" width="11" height="36" rx="5.5" fill="${furDark}"/>
          <rect x="119" y="140" width="11" height="36" rx="5.5" fill="${furDark}"/>
        </g>
        <g class="pet-body">
          <ellipse cx="100" cy="140" rx="36" ry="27" fill="${fur}"/>
          <ellipse cx="100" cy="148" rx="19" ry="16" fill="${light}"/>
        </g>
        <g class="legs">
          <rect x="84" y="150" width="11" height="30" rx="5.5" fill="${fur}"/>
          <rect x="105" y="150" width="11" height="30" rx="5.5" fill="${fur}"/>
          <ellipse cx="89.5" cy="178" rx="7" ry="4" fill="${light}"/>
          <ellipse cx="110.5" cy="178" rx="7" ry="4" fill="${light}"/>
        </g>
        <g class="pet-head">
          <g class="ear-l"><path d="M70 76 L49 18 L97 54 Z" fill="${fur}" stroke="${fur}" stroke-width="6" stroke-linejoin="round"/><path d="M72 66 L57 31 L88 56 Z" fill="${pink}"/></g>
          <g class="ear-r"><path d="M130 76 L151 18 L103 54 Z" fill="${fur}" stroke="${fur}" stroke-width="6" stroke-linejoin="round"/><path d="M128 66 L143 31 L112 56 Z" fill="${pink}"/></g>
          <ellipse cx="100" cy="82" rx="40" ry="34" fill="${fur}"/>
          <ellipse cx="100" cy="68" rx="7" ry="14" fill="${light}"/>
          <ellipse cx="100" cy="98" rx="19" ry="13" fill="${light}"/>
          <circle cx="73" cy="96" r="6" fill="${pink}" opacity=".5"/>
          <circle cx="127" cy="96" r="6" fill="${pink}" opacity=".5"/>
          ${eyes(83, 117, 80, 8.5)}
          <ellipse cx="100" cy="92" rx="5.5" ry="4" fill="${INK}"/>
          <path class="tongue" d="M96.5 101 Q100 112 103.5 101 Z" fill="#EF7B7B"/>
          <path class="mouth" d="M93 99 Q96.5 103.5 100 99 Q103.5 103.5 107 99" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path class="mouth-sad" d="M94 104 Q100 99 106 104" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M77 109 Q100 122 123 109" stroke="#3B82C4" stroke-width="6" fill="none" stroke-linecap="round"/>
          <circle cx="100" cy="118" r="4.5" fill="#F4B740"/>
          ${tear(121, 87)}
        </g>
      </svg>`;
    }
  },

  pug: {
    name: 'Pug', the: 'el pug', cheer: '¡Guau guau! 🐶', say: '¡Guau!',
    svg() {
      const fur = '#E9D2AA', furDark = '#D2B686', light = '#F5E7CF', mask = '#3B3431', nose = '#1C1716';
      return `<svg class="pet" viewBox="0 0 200 200" aria-hidden="true">
        <g class="pet-tail"><path d="M130 132 C148 134 154 116 143 111 C134 107 128 118 137 122" stroke="${furDark}" stroke-width="9" fill="none" stroke-linecap="round"/></g>
        <g class="legs">
          <rect x="67" y="140" width="14" height="35" rx="7" fill="${furDark}"/>
          <rect x="119" y="140" width="14" height="35" rx="7" fill="${furDark}"/>
        </g>
        <g class="pet-body">
          <ellipse cx="100" cy="141" rx="41" ry="29" fill="${fur}"/>
          <ellipse cx="100" cy="149" rx="21" ry="16" fill="${light}"/>
        </g>
        <g class="legs">
          <rect x="82" y="150" width="14" height="30" rx="7" fill="${fur}"/>
          <rect x="104" y="150" width="14" height="30" rx="7" fill="${fur}"/>
          <ellipse cx="89" cy="178" rx="8" ry="4" fill="${light}"/>
          <ellipse cx="111" cy="178" rx="8" ry="4" fill="${light}"/>
        </g>
        <g class="pet-head">
          <g class="ear-l"><path d="M64 68 Q52 50 73 45 Q86 53 80 70 Z" fill="${mask}"/></g>
          <g class="ear-r"><path d="M136 68 Q148 50 127 45 Q114 53 120 70 Z" fill="${mask}"/></g>
          <ellipse cx="100" cy="84" rx="43" ry="36" fill="${fur}"/>
          <path d="M87 58 Q100 52 113 58 M90 65 Q100 60 110 65" stroke="${furDark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <ellipse cx="81" cy="83" rx="14" ry="13" fill="${mask}" opacity=".3"/>
          <ellipse cx="119" cy="83" rx="14" ry="13" fill="${mask}" opacity=".3"/>
          <ellipse cx="100" cy="100" rx="24" ry="17" fill="${mask}"/>
          <circle cx="70" cy="100" r="6" fill="#F4A28C" opacity=".5"/>
          <circle cx="130" cy="100" r="6" fill="#F4A28C" opacity=".5"/>
          ${eyes(81, 119, 82, 10, '#241D1B')}
          <ellipse cx="100" cy="93" rx="7.5" ry="5" fill="${nose}"/>
          <path class="tongue" d="M96 103 Q100 116 104 103 Z" fill="#EF7B7B"/>
          <path class="mouth" d="M91 101 Q95.5 106 100 101 Q104.5 106 109 101" stroke="${nose}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          <path class="mouth-sad" d="M93 108 Q100 102 107 108" stroke="${nose}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          <path d="M76 114 Q100 127 124 114" stroke="#F29E86" stroke-width="6" fill="none" stroke-linecap="round"/>
          <circle cx="100" cy="123" r="4.5" fill="#F4B740"/>
          ${tear(124, 90)}
        </g>
      </svg>`;
    }
  },

  dino: {
    name: 'Dinosaurio', the: 'el dino', cheer: '¡Rawr! 🦖', say: '¡Rawr!',
    svg() {
      const fur = '#8FD19E', dark = '#70BB82', belly = '#E6F4D7', spike = '#F29E86', snout = '#A9DEB6';
      return `<svg class="pet" viewBox="0 0 200 200" aria-hidden="true">
        <g class="pet-tail"><path d="M126 158 Q162 160 178 126 Q170 131 160 136 Q146 144 128 138 Z" fill="${dark}"/></g>
        <g class="legs">
          <rect x="64" y="142" width="17" height="33" rx="8.5" fill="${dark}"/>
          <rect x="119" y="142" width="17" height="33" rx="8.5" fill="${dark}"/>
        </g>
        <g class="pet-body">
          <ellipse cx="100" cy="142" rx="39" ry="30" fill="${fur}"/>
          <ellipse cx="100" cy="150" rx="22" ry="18" fill="${belly}"/>
          <path d="M86 143 H114 M84 151 H116 M88 159 H112" stroke="#CFE6BC" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <g class="legs">
          <rect x="83" y="152" width="14" height="28" rx="7" fill="${fur}"/>
          <rect x="103" y="152" width="14" height="28" rx="7" fill="${fur}"/>
          <path d="M85 179 h3 M89 179 h3 M93 179 h2 M105 179 h3 M109 179 h3 M113 179 h2" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
        </g>
        <g class="pet-head">
          <g class="ear-l" fill="${spike}" stroke="${spike}" stroke-width="3" stroke-linejoin="round"><path d="M68 62 L58 44 L78 53 Z"/><path d="M80 52 L77 32 L92 46 Z"/></g>
          <g class="ear-r" fill="${spike}" stroke="${spike}" stroke-width="3" stroke-linejoin="round"><path d="M132 62 L142 44 L122 53 Z"/><path d="M120 52 L123 32 L108 46 Z"/></g>
          <path d="M93 48 L100 26 L107 48 Z" fill="${spike}" stroke="${spike}" stroke-width="3" stroke-linejoin="round"/>
          <ellipse cx="100" cy="82" rx="41" ry="35" fill="${fur}"/>
          <circle cx="77" cy="62" r="4" fill="${dark}" opacity=".7"/><circle cx="124" cy="64" r="3" fill="${dark}" opacity=".7"/><circle cx="87" cy="55" r="2.5" fill="${dark}" opacity=".7"/>
          <ellipse cx="100" cy="99" rx="25" ry="15" fill="${snout}"/>
          <circle cx="70" cy="94" r="6" fill="#F4A28C" opacity=".55"/>
          <circle cx="130" cy="94" r="6" fill="#F4A28C" opacity=".55"/>
          ${eyes(82, 118, 79, 9)}
          <ellipse cx="93" cy="94" rx="2.4" ry="1.8" fill="${INK}"/><ellipse cx="107" cy="94" rx="2.4" ry="1.8" fill="${INK}"/>
          <path class="tongue" d="M96.5 103 Q100 113 103.5 103 Z" fill="#EF7B7B"/>
          <g class="mouth">
            <path d="M89 101 Q94.5 106 100 101 Q105.5 106 111 101" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M91.5 103 l2 4 l2 -4 Z M104.5 103 l2 4 l2 -4 Z" fill="#fff"/>
          </g>
          <path class="mouth-sad" d="M93 108 Q100 103 107 108" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
          ${tear(122, 87)}
        </g>
      </svg>`;
    }
  },

  gato: {
    name: 'Gato', the: 'el gatito', cheer: '¡Miau! 🐱', say: '¡Miau!',
    svg() {
      const fur = '#F4B47C', dark = '#E2925A', light = '#FCE7D2', pink = '#F4A28C';
      return `<svg class="pet" viewBox="0 0 200 200" aria-hidden="true">
        <g class="pet-tail"><path d="M132 150 C164 150 172 116 151 95" stroke="${dark}" stroke-width="10" fill="none" stroke-linecap="round"/></g>
        <g class="legs">
          <rect x="70" y="140" width="12" height="36" rx="6" fill="${dark}"/>
          <rect x="118" y="140" width="12" height="36" rx="6" fill="${dark}"/>
        </g>
        <g class="pet-body">
          <ellipse cx="100" cy="141" rx="37" ry="27" fill="${fur}"/>
          <ellipse cx="100" cy="148" rx="19" ry="16" fill="${light}"/>
          <path d="M69 131 q7 5 4 13 M131 131 q-7 5 -4 13" stroke="${dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        </g>
        <g class="legs">
          <rect x="84" y="150" width="12" height="30" rx="6" fill="${fur}"/>
          <rect x="104" y="150" width="12" height="30" rx="6" fill="${fur}"/>
          <ellipse cx="90" cy="178" rx="7.5" ry="4" fill="${light}"/>
          <ellipse cx="110" cy="178" rx="7.5" ry="4" fill="${light}"/>
        </g>
        <g class="pet-head">
          <g class="ear-l"><path d="M64 74 L60 30 L98 56 Z" fill="${fur}" stroke="${fur}" stroke-width="6" stroke-linejoin="round"/><path d="M68 64 L66 40 L88 57 Z" fill="${pink}"/></g>
          <g class="ear-r"><path d="M136 74 L140 30 L102 56 Z" fill="${fur}" stroke="${fur}" stroke-width="6" stroke-linejoin="round"/><path d="M132 64 L134 40 L112 57 Z" fill="${pink}"/></g>
          <ellipse cx="100" cy="84" rx="43" ry="34" fill="${fur}"/>
          <path d="M100 52 V64 M89 55 L91 64 M111 55 L109 64 M58 82 H68 M59 90 H67 M142 82 H132 M141 90 H133" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>
          <ellipse cx="100" cy="98" rx="18" ry="12" fill="${light}"/>
          <circle cx="74" cy="97" r="6" fill="${pink}" opacity=".5"/>
          <circle cx="126" cy="97" r="6" fill="${pink}" opacity=".5"/>
          <g class="eyes-open">
            <circle cx="83" cy="81" r="9" fill="#86C48F"/><ellipse cx="83" cy="81" rx="3.4" ry="7.5" fill="${INK}"/><circle cx="86" cy="77.5" r="2.6" fill="#fff"/>
            <circle cx="117" cy="81" r="9" fill="#86C48F"/><ellipse cx="117" cy="81" rx="3.4" ry="7.5" fill="${INK}"/><circle cx="120" cy="77.5" r="2.6" fill="#fff"/>
          </g>
          <g class="eyes-closed" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round">
            <path d="M76 83 Q83 88 90 83"/><path d="M110 83 Q117 88 124 83"/>
          </g>
          <path d="M95.5 91 H104.5 L100 96 Z" fill="#E98686" stroke="#E98686" stroke-width="2" stroke-linejoin="round"/>
          <path class="tongue" d="M97 101 Q100 109 103 101 Z" fill="#EF7B7B"/>
          <path class="mouth" d="M100 96 V99 M93 99 Q96.5 103.5 100 99 Q103.5 103.5 107 99" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path class="mouth-sad" d="M94 104 Q100 99 106 104" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M82 98 L60 94 M82 102 L60 105 M118 98 L140 94 M118 102 L140 105" stroke="#B98B6A" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
          <path d="M77 111 Q100 123 123 111" stroke="#3B82C4" stroke-width="6" fill="none" stroke-linecap="round"/>
          <circle cx="100" cy="120" r="5" fill="#F4B740"/><path d="M97 121 H103" stroke="#C98A1E" stroke-width="1.4"/>
          ${tear(122, 88)}
        </g>
      </svg>`;
    }
  },
};

const CUSTOM_PET = { name: 'Mi imagen', the: 'tu mascota', cheer: '¡Yupi! ✨', say: '¡Ahorra!' };
