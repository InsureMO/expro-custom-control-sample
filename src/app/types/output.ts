/** 
 * Output event data to parent app (parentAppData) event
  */
export class ParentAppOutput{
  Payload: ParentAppOutputPayload = new ParentAppOutputPayload()
}
export class ParentAppOutputPayload{
  //target address object/entity in the transaction
  TargetObject: Record<string,any> = {} 
}