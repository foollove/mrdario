var fs = require('fs');
var _ = require('lodash');
var SVGO = require('svgo');

var svgo  = new SVGO({
  plugins: [
    // remove width and height so svg can be responsive using viewBox
    // {removeDimensions: true}
  ]
});

var spritesDir = '../assets/sprite';
var outDir = '../web-client/src/svg2';
var filenames = fs.readdirSync(spritesDir);

filenames.forEach((filename) => {
  console.log(filename);
  fs.readFile(`${spritesDir}/${filename}`, 'utf8', (err, data) => {
    if(err) throw err;

    // optimize svg file in sprite directory...
    const outPath = `${outDir}/${filename.replace('mrdario_','')}`;
    console.log(outPath)

    svgo.optimize(data).then((optimized) => {
      console.log(`optimized ${filename}`);

      // ...and save to output directory
      fs.writeFile(outPath, optimized.data, (err) => {
        if(err) throw err;
        console.log(`saved ${outPath}`);
      });
    });

  });
});
