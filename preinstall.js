if (!/pnpm/.test(process.env.npm_execpath || '')) {
  console.error(
    "This repository must using pnpm >=9.8.0 as the package manager for scripts to work properly. \n"
  )
  process.exit(1)
} else if (process.versions.node < '18.19.1') {
  console.error(
    "This repository must have node >=18.19.1 in order to function properly. \n"
  )
  process.exit(1)
}
