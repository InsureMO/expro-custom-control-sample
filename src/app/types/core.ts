import { AppComponent } from "../app.component"


//use this registry to allow complex interactions between different components
//for example, emitting events from child components over to parent app
export class CoreComponentRegistry {
  appComponent : AppComponent | undefined= undefined
}

export type ComponentInRegistry = 'App'