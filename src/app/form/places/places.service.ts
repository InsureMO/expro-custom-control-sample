import { inject, Injectable } from "@angular/core";
import { AppService } from "../../types/service";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { SearchPalcesDetailsRequest, SearchPalcesRequest, SearchPlacesDetailsResult, SearchPlacesResult } from "./model";
import { Observable } from "rxjs";
import { SessionService } from "../../services/session.service";
import { PlacesComponent } from "./places.component";

@Injectable({providedIn:PlacesComponent})
export class PlacesService implements AppService{

    http = inject(HttpClient)
    sessionService = inject(SessionService)

    //reset cache data if any
    reset(){

    }

    searchPlacesByText(req:SearchPalcesRequest): Observable<SearchPlacesResult>{
        let headers = new HttpHeaders()
        headers = headers.append("Authorization",
            this.sessionService.customAppContext()?.insuremo.access_token ?? '')
            
        let params = new HttpParams()
        params = params.append("input", req.input)
            
        let url = this.sessionService.customAppContext()?.places.api_search_places ?? ''
        return this.http.get<SearchPlacesResult>(url,{headers, params})
    }


    searchPlaceDetailByPlaceID(place_id:string): Observable<SearchPlacesDetailsResult>{
        let headers = new HttpHeaders()
        headers = headers.append("Authorization",
            this.sessionService.customAppContext()?.insuremo.access_token ?? '')
            
        let params = new HttpParams()
        params = params.append("placeid", place_id)
            
        let url = this.sessionService.customAppContext()?.places.api_search_place_details ?? ''
        return this.http.get<SearchPlacesDetailsResult>(url,{headers, params})
    }


}