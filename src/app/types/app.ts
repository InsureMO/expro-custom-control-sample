export class AppLoadError{
    title: string
    message: string

    constructor(title:string,msg:string){
        this.title = title
        this.message = msg
    }
}