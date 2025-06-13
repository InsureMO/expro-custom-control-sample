const esbuild = require("esbuild")
const fs = require("fs")
const process = require("process");

// Array of input files. Can be dynamically generated at build time
const entries = []
const final_target = "dist/browser/expro_address_control.js"
const tempFile = "dist/browser/temp.js"

// Loop through all the files in the dist/brower dir to collect bundled files
fs.readdir("dist/browser", function (err, files) {
    if (err) {
      console.error("Could not list the directory.", err);
      process.exit(1);
    }  
    files.forEach((file_name, index)=>{
      if(file_name.includes(".js")){
        console.log("[POST BUILD] JS File To Include: ",file_name);
        entries.push(file_name)
      } 
    })
    fs.writeFileSync(
      tempFile,
      entries.map( entry => `import "./${entry}"` ).join( ';\n' ) //import all js files
      )
    
    build()
})


async function build(){
  console.debug(`[POST BUILD] Building Final Target Bundle:  ${final_target}`)
  // esbuild
  await esbuild.build( {
    entryPoints: [ tempFile ], //set temp file as entry point
    bundle: true,
    minify: true,
    target: 'es6',
    outfile: final_target, //output to a single finle
  })
}




