# Expro Custom Control

### UI Component Library: 
* Prime Ng Documentation: https://primeng.org/ 

### Stylesheets:
* CSS Grid Layout Documentation: https://getbootstrap.com/docs/5.0/layout/grid/
* CSS Isolations using `ViewEncapsulation.ShadowDOM`
    
## Angular Specifics: 
This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.1.

### Project Configuation 
* Default Change Detection: `OnPush`
* Default Stylesheet: `scss`
* File Replacements: `environment.ts` 
* Zone.js : removed from `polyfills.js` in favour of signal based reactivity


### Development server 

To start a local development server, run:

```bash
pnpm local
```
or
```bash
pnpm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

### Building

To build the project run:

```bash
pnpm package
```
or
```bash
pnpm pkg
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.
Once build has completed, we run `postbuild.js` to compile all artifacts and lazy chunks to a single JS bundle using `esbuild`.

### Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

### Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

### Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
