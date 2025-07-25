import { inject, Injectable } from "@angular/core";
import { AppService } from "../../types/service";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { SessionService } from "../../services/session.service";

import { 
    VehicleLookupByPlateRequest, VehicleLookupByPlateResponse, 
    VehicleDetailsLookupByNVICRequest, VehicleDetailsLookupByNVICResponse,
    VehicleMakeLookupRequest, VehicleMakeLookupResponse,
    VehicleModelLookupRequest, VehicleModelLookupResponse,
    VehicleVariantLookupRequest, VehicleVariantLookupResponse,
    VehicleNvicListLookupRequest, VehicleNvicListLookupResponse
} from "./model";
import { VehicleComponent } from "./vehicle.component";

@Injectable({providedIn:VehicleComponent})
export class VehicleService implements AppService{

    http = inject(HttpClient)
    sessionService = inject(SessionService)

    //reset cache data if any
    reset(){

    }

    vehicleLookupByPlate(req: VehicleLookupByPlateRequest): Observable<VehicleLookupByPlateResponse> {
        let headers = new HttpHeaders()
        headers = headers.append("Authorization", 
            `${this.sessionService.customAppContext()?.insuremo.access_token ?? ''}`)
        
        let params = new HttpParams()
        params = params.append("state", req.state)
        params = params.append("plate", req.plate)
        let url = this.sessionService.customAppContext()?.vehicle.api_vehicle_lookup_by_plate ?? ''
        return this.http.get<VehicleLookupByPlateResponse>(url, {headers, params})
    }

    vehicleLookupByNVIC(req: VehicleDetailsLookupByNVICRequest): Observable<VehicleDetailsLookupByNVICResponse> {
        let headers = new HttpHeaders()
        headers = headers.append("Authorization", 
            `${this.sessionService.customAppContext()?.insuremo.access_token ?? ''}`)
        headers = headers.append("Content-Type", "application/json")
        
        let url = this.sessionService.customAppContext()?.vehicle.api_vehicle_lookup_by_nvic ?? ''
        return this.http.post<VehicleDetailsLookupByNVICResponse>(url, req, {headers})
    }

    vehicleMakeLookup(req: VehicleMakeLookupRequest): Observable<VehicleMakeLookupResponse> {
        let headers = new HttpHeaders()
        headers = headers.append("Authorization", 
            `${this.sessionService.customAppContext()?.insuremo.access_token ?? ''}`)
        headers = headers.append("Content-Type", "application/json")
        
        let url = this.sessionService.customAppContext()?.vehicle.api_vehicle_year_range ?? ''
        return this.http.post<VehicleMakeLookupResponse>(url, req, {headers})
    }

    vehicleModelLookup(req: VehicleModelLookupRequest): Observable<VehicleModelLookupResponse> {
        let headers = new HttpHeaders()
        headers = headers.append("Authorization", 
            `${this.sessionService.customAppContext()?.insuremo.access_token ?? ''}`)
        headers = headers.append("Content-Type", "application/json")
        
        let url = this.sessionService.customAppContext()?.vehicle.api_vehicle_make_models ?? ''
        return this.http.post<VehicleModelLookupResponse>(url, req, {headers})
    }

    vehicleVariantLookup(req: VehicleVariantLookupRequest): Observable<VehicleVariantLookupResponse> {
        let headers = new HttpHeaders()
        headers = headers.append("Authorization", 
            `${this.sessionService.customAppContext()?.insuremo.access_token ?? ''}`)
        headers = headers.append("Content-Type", "application/json")
        
        let url = this.sessionService.customAppContext()?.vehicle.api_vehicle_make_variants ?? ''
        return this.http.post<VehicleVariantLookupResponse>(url, req, {headers})
    }

    vehicleNvicListLookup(req: VehicleNvicListLookupRequest): Observable<VehicleNvicListLookupResponse> {
        let headers = new HttpHeaders()
        headers = headers.append("Authorization", 
            `${this.sessionService.customAppContext()?.insuremo.access_token ?? ''}`)
        headers = headers.append("Content-Type", "application/json")
        
        let url = this.sessionService.customAppContext()?.vehicle.api_vehicle_list_nvic ?? ''
        return this.http.post<VehicleNvicListLookupResponse>(url, req, {headers})
    }

}