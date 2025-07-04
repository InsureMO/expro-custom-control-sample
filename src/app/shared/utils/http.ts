import { HttpErrorResponse, HttpHeaders } from "@angular/common/http";

export function GetServerMsgFromHttpError(error:HttpErrorResponse){
    if(error.error && error.error.message) return  error.error.message
    if(error.message) return  error.message
    return error.error
}

