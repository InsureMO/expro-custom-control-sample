/** 
 * App services added to this control must implement reset if data is cached\
 * When the app is destroyed, reset will be invoked by app-component
  */
export interface AppService{
    reset: Function
}