import { inject, Injectable } from "@angular/core";
import { AppService } from "../../types/service";
import { AbnComponent } from "./abn.component";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { EntityStatus, SearchByNameRequest, SearchByNameResult, SearchByNumRequest, SearchByNumResult } from "./model";
import { Observable } from "rxjs";
import { SessionService } from "../../services/session.service";

@Injectable({providedIn:AbnComponent})
export class AbnService implements AppService{

    http = inject(HttpClient)
    sessionService = inject(SessionService)

    //reset cache data if any
    reset(){

    }

    searchByName(req:SearchByNameRequest): Observable<SearchByNameResult[]>{
        let headers = new HttpHeaders()
        headers = headers.append("Authorization",this.sessionService.insuremoToken)
        headers = headers.append("AuthenticationGuid",
            this.sessionService.customAppContext()?.abn.auth_guid ?? '')

        let url = this.sessionService.customAppContext()?.abn.api_search_by_name ?? ''
        return this.http.post<SearchByNameResult[]>(url,req,{headers})
    }

    searchByNumber(req:SearchByNumRequest): Observable<SearchByNumResult[]>{
        let headers = new HttpHeaders()
        headers = headers.append("Authorization",this.sessionService.insuremoToken)
        headers = headers.append("AuthenticationGuid",
            this.sessionService.customAppContext()?.abn.auth_guid ?? '')

        let url = this.sessionService.customAppContext()?.abn.api_search_by_num ?? ''
        return this.http.post<SearchByNumResult[]>(url,req,{headers})
    }

    calculateOperatingYears(details:SearchByNumResult) : number | undefined{
        let entityStatus : EntityStatus | undefined= undefined
        if(Array.isArray(details.businessEntity202001.entityStatus)) {
            entityStatus = details.businessEntity202001.entityStatus.find(e=>e.entityStatusCode==='Active')
        } else if(typeof details.businessEntity202001.entityStatus==='object'){
            entityStatus = details.businessEntity202001.entityStatus
        }

        if(!entityStatus) return
        const today = new Date()
        const regDate = new Date(entityStatus.effectiveFrom)
        // calculate the difference in milliseconds
        const timeDiff = today.getTime() - regDate.getTime();
        // convert to years (milliseconds to days to years)
        const yearsDiff = timeDiff / (1000 * 60 * 60 * 24 * 365.25);
        return Math.floor(yearsDiff);
    }
}