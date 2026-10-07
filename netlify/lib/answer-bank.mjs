/** Authored science answers. Specific question patterns avoid arbitrary substring matches. */
export const answerBank=Object.freeze([
 {id:'axolotl',match:/\baxolotls?\b.{0,25}\b(?:eat|food|diet)\b/i,text:'Axolotls eat worms, bugs, and small fish. They suck food into their mouths.'},
 {id:'octopus',match:/\boctop(?:us|uses)\b.{0,25}\b(?:three|3) hearts\b/i,text:'Two hearts pump blood through the gills. One pumps blood around the body. This helps it take in oxygen.'},
 {id:'sky',match:/\bsky\b.{0,20}\bblue\b|\bblue\b.{0,20}\bsky\b/i,text:'Sunlight has many colors. Air spreads blue light across the sky.'},
 {id:'plants',match:/\bplants?\b.{0,25}\bgrow\b|\bgrow\b.{0,25}\bplants?\b/i,text:'Plants need light, water, and air. Roots take water from the soil.'},
 {id:'rain',match:/\b(?:why|how|where)\b.{0,25}\b(?:rain|rains|rainfall)\b/i,text:'Clouds hold tiny drops of water. Heavy drops fall as rain.'},
 {id:'moon',match:/\bmoon\b.{0,25}\b(?:shine|shines|light|glow)\b/i,text:'The moon does not make light. It reflects light from the sun.'},
 {id:'rainbow',match:/\b(?:why|how|what)\b.{0,25}\brainbows?\b/i,text:'Sunlight passes through drops of water. The drops split light into many colors.'},
 {id:'leaves',match:/\bleaves?\b.{0,20}\b(?:green|light|food)\b/i,text:'Leaves bounce green light back to us. They use other light to make food.'},
 {id:'fish',match:/\bfish\b.{0,20}\b(?:breathe|breathes|breathing)\b/i,text:'Fish use gills to breathe. Gills take oxygen from the water.'},
 {id:'birds',match:/\bbirds?\b.{0,20}\b(?:fly|flies|flying)\b/i,text:'Wings push air down as birds flap. That push helps lift them up.'},
 {id:'bees',match:/\bbees?\b.{0,25}\b(?:honey|flowers)\b/i,text:'Bees gather sweet juice from flowers. They turn it into honey.'},
 {id:'magnets',match:/\b(?:how|why|what)\b.{0,20}\bmagnets?\b/i,text:'Magnets pull some kinds of metal. They can push other magnets away.'},
 {id:'ice',match:/\bice\b.{0,20}\b(?:melt|melts|melting)\b/i,text:'Heat warms the ice. The ice turns into liquid water.'},
 {id:'stars',match:/\b(?:what|why|how)\b.{0,20}\bstars?\b/i,text:'Stars are huge balls of hot gas. They make their own light.'},
 {id:'day-night',match:/\b(?:day and night|night and day|why.{0,12}night)\b/i,text:'Earth turns as it moves through space. Our side faces away at night.'},
 {id:'clouds',match:/\b(?:what|how)\b.{0,20}\bclouds?\b/i,text:'Clouds hold tiny water drops or ice bits. They float high in the air.'},
 {id:'gravity',match:/\bgravity\b|\bwhy\b.{0,20}\b(?:things|objects)\b.{0,10}\bfall\b/i,text:'Earth pulls things toward its center. We call this pull gravity.'},
 {id:'floating',match:/\b(?:boats?|ships?)\b.{0,20}\bfloat\b/i,text:'A boat pushes water out of its way. The water pushes back and holds it up.'},
 {id:'seeds',match:/\bseeds?\b.{0,25}\b(?:grow|sprout|need)\b/i,text:'A seed holds a tiny plant inside. Water helps it start to grow.'},
 {id:'butterflies',match:/\b(?:caterpillars?|butterflies|butterfly)\b.{0,25}\b(?:change|grow|become|wings)\b/i,text:'A caterpillar makes a case. Its body changes inside. It comes out with wings.'},
 {id:'sleep',match:/\bwhy\b.{0,20}\b(?:sleep|tired)\b/i,text:'Sleep gives your body time to rest. It helps your brain learn and grow.'},
 {id:'math',match:/\b(?:two (?:and|plus) two|2\s*\+\s*2)\b/i,text:'Two and two make four. Four is an even number.'}
]);
export const unknownAnswer='That one has me stumped. We can find out with a grown-up.';
export function knownAnswer(question){return answerBank.find(item=>item.match.test(question));}
export function authoredAnswer(question){return knownAnswer(question)?.text||unknownAnswer;}
