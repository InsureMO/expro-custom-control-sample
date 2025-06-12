  export function SafeJsonParse(str:string) : [any,string]{
    try {
      let parsed = JSON.parse(str)
      return [parsed,""]
    }catch(error){
      console.debug("Safe JSON parse failed:",str);
      return [str,(error as Error).message] 
    }
    
  }
