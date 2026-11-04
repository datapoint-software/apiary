const words: readonly string[] = [
  'acorn', 'actor', 'adobe', 'agate', 'alarm', 'album', 'alder', 'alley', 'alpine', 'amber', 'ample', 'anchor', 'angle', 'ankle', 'apple',
  'apron', 'arbor', 'arch', 'arena', 'armor', 'arrow', 'aspen', 'atlas', 'attic', 'autumn', 'avenue', 'award', 'bacon', 'badge', 'bagel',
  'baker', 'balcony', 'ballet', 'bamboo', 'banana', 'banjo', 'banner', 'barley', 'barn', 'barrel', 'basil', 'basin', 'basket', 'beacon',
  'beam', 'bean', 'bear', 'beaver', 'beetle', 'bench', 'berry', 'bike', 'birch', 'bison', 'blade', 'blanket', 'blossom', 'board', 'boat',
  'bonnet', 'boot', 'bottle', 'boulder', 'bowl', 'bramble', 'branch', 'brass', 'bread', 'breadth', 'breeze', 'brick', 'bridge', 'brook',
  'broom', 'bubble', 'bucket', 'buckle', 'budget', 'buffalo', 'bugle', 'bundle', 'burrow', 'butter', 'button', 'cabin', 'cable', 'cactus',
  'camel', 'camera', 'candle', 'candor', 'candy', 'canoe', 'canvas', 'canyon', 'captain', 'carbon', 'cargo', 'carpet', 'carrot', 'cashew',
  'castle', 'cedar', 'cellar', 'cello', 'chalk', 'channel', 'chapel', 'cherry', 'chess', 'chest', 'chimney', 'cider', 'cinema', 'circle',
  'citrus', 'clay', 'cliff', 'clock', 'cloud', 'clover', 'coast', 'cobalt', 'cobble', 'cocoa', 'coconut', 'comet', 'compass', 'copper',
  'coral', 'cosmos', 'cotton', 'couch', 'cougar', 'cover', 'coyote', 'crane', 'crater', 'crayon', 'creek', 'cricket', 'crimson', 'crown',
  'crystal', 'cube', 'cupboard', 'curtain', 'cushion', 'cycle', 'cypress', 'dahlia', 'daisy', 'dancer', 'delta', 'denim', 'desert',
  'dewdrop', 'diamond', 'dinner', 'dolphin', 'domino', 'donkey', 'dove', 'dragon', 'drawer', 'dream', 'drizzle', 'drum', 'dune', 'eagle',
  'easel', 'echo', 'eclipse', 'elbow', 'elder', 'elm', 'ember', 'emerald', 'engine', 'fable', 'falafel', 'falcon', 'feast', 'feather',
  'fence', 'fern', 'ferry', 'festival', 'fiddle', 'field', 'fiesta', 'fig', 'finch', 'firefly', 'flag', 'flame', 'flannel', 'fleece',
  'flint', 'flower', 'flurry', 'flute', 'foam', 'fog', 'forest', 'forge', 'fossil', 'fountain', 'fox', 'frost', 'gadget', 'galaxy',
  'gallery', 'garden', 'garlic', 'garnet', 'gate', 'gecko', 'geyser', 'ginger', 'glacier', 'glimmer', 'globe', 'glove', 'goat', 'gondola',
  'goose', 'gopher', 'gourd', 'granite', 'grape', 'gravel', 'griddle', 'grove', 'guitar', 'gull', 'gumbo', 'hamlet', 'hammer', 'harbor',
  'harp', 'harvest', 'hawk', 'hazel', 'hedge', 'helmet', 'heron', 'hiker', 'hill', 'hollow', 'honey', 'hoop', 'horizon', 'hornbill',
  'hornet', 'house', 'hummus', 'hutch', 'icicle', 'igloo', 'index', 'indigo', 'inlet', 'iris', 'island', 'ivory', 'jackal', 'jacket',
  'jade', 'jaguar', 'jar', 'jasmine', 'jelly', 'jersey', 'jetty', 'jewel', 'jigsaw', 'jogger', 'journal', 'jukebox', 'jungle', 'juniper',
  'kayak', 'kelp', 'kernel', 'kettle', 'kiln', 'kite', 'kitten', 'kiwi', 'knapsack', 'koala', 'ladder', 'lagoon', 'lake', 'lamp',
  'lantana', 'lantern', 'larch', 'lark', 'latch', 'laurel', 'lava', 'lemon', 'lemur', 'lens', 'lentil', 'letter', 'lichen', 'lilac',
  'lily', 'lilypad', 'lime', 'linden', 'linen', 'lion', 'lizard', 'llama', 'lobster', 'locket', 'locust', 'lodge', 'loom', 'lotus',
  'lunar', 'lupine', 'lynx', 'magnet', 'mallard', 'mallow', 'mango', 'mantle', 'maple', 'marble', 'market', 'marsh', 'mason', 'meadow',
  'meerkat', 'melon', 'mesa', 'meteor', 'minnow', 'mint', 'mirror', 'mitten', 'mocha', 'module', 'monkey', 'monsoon', 'moose', 'mortar',
  'mosaic', 'moss', 'motor', 'mountain', 'muffin', 'mulberry', 'museum', 'nectar', 'needle', 'nest', 'nickel', 'nimbus', 'noodle', 'north',
  'nugget', 'nutmeg', 'oak', 'oasis', 'oatmeal', 'ocean', 'ocelot', 'octave', 'olive', 'onion', 'opal', 'orange', 'orbit', 'orchard',
  'orchid', 'oregano', 'osprey', 'otter', 'oven', 'owl', 'paddle', 'palace', 'panda', 'panther', 'paper', 'paprika', 'parade', 'parrot',
  'parsnip', 'pasta', 'pasture', 'patio', 'peach', 'peanut', 'pearl', 'pebble', 'pecan', 'pelican', 'pencil', 'pepper', 'pepperoni',
  'petal', 'pewter', 'piano', 'pickle', 'pigeon', 'pillow', 'pilot', 'pine', 'pinecone', 'pirate', 'planet', 'plaza', 'plover', 'plum',
  'pocket', 'polar', 'pony', 'poppy', 'portal', 'potato', 'prairie', 'pretzel', 'prism', 'puddle', 'puffin', 'pumpkin', 'puzzle', 'quail',
  'quarry', 'quartz', 'quill', 'quilt', 'quiver', 'rabbit', 'radar', 'radish', 'rain', 'raisin', 'rapids', 'rattan', 'raven', 'reef',
  'relish', 'rhubarb', 'ribbon', 'rice', 'riddle', 'ridge', 'river', 'robin', 'rocket', 'rooster', 'rose', 'rowboat', 'ruby', 'rudder',
  'rustic', 'saddle', 'saffron', 'sail', 'salmon', 'salt', 'sand', 'sapphire', 'sardine', 'satin', 'scarf', 'school', 'seal', 'sequoia',
  'shadow', 'shell', 'shelter', 'shore', 'shrub', 'sierra', 'silk', 'silver', 'sketch', 'skiff', 'sled', 'slope', 'snow', 'socket', 'sofa',
  'solar', 'sorrel', 'sparrow', 'spice', 'spider', 'spinach', 'spindle', 'spoon', 'spring', 'sprout', 'spruce', 'squash', 'squirrel',
  'stable', 'star', 'starling', 'stone', 'stork', 'straw', 'stream', 'summit', 'sun', 'sunflower', 'swan', 'sweater', 'table', 'tablet',
  'tadpole', 'tamarind', 'tango', 'tapestry', 'teacup', 'teapot', 'temple', 'tennis', 'thimble', 'thistle', 'thunder', 'thyme', 'tiger',
  'timber', 'tinsel', 'toast', 'tomato', 'topaz', 'torch', 'toucan', 'tower', 'trail', 'train', 'trellis', 'trout', 'truffle', 'tugboat',
  'tulip', 'tundra', 'tunnel', 'turnip', 'turtle', 'tuxedo', 'twig', 'umbrella', 'unicorn', 'valley', 'valve', 'vanilla', 'vapor',
  'velvet', 'veranda', 'vessel', 'vine', 'violet', 'violin', 'volcano', 'waffle', 'wagon', 'walnut', 'walrus', 'warbler', 'wasabi', 'wave',
  'weasel', 'wharf', 'wheat', 'whistle', 'wicker', 'willow', 'window', 'winter', 'wizard', 'wolf', 'wombat', 'wood', 'wren', 'yacht',
  'yarrow', 'yodel', 'yogurt', 'yucca', 'zebra', 'zenith', 'zephyr', 'zigzag', 'zinc',
];

export function passphrase(): string {
  const random = crypto.getRandomValues(new Uint32Array(5));
  const pool = [...words];
  const picked = [0, 1, 2, 3].map((i) => pool.splice(random[i] % pool.length, 1)[0]);
  return `${picked.join('-')}-${10 + (random[4] % 90)}`;
}

export function linkKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
