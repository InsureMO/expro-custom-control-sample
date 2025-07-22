/** 
 * App services added to this control must implement reset if data is cached\
 * When the app is destroyed, reset will be invoked by app-component
  */
export interface AppService{
    reset: Function
}

export interface MatchedSubstring {
    length: number;
    offset: number;
}

export interface StructuredFormatting {
    main_text: string;
    main_text_matched_substrings: MatchedSubstring[];
    secondary_text: string;
}

export interface Term {
    offset: number;
    value: string;
}

export interface SearchPlacePrediction {
    description: string;
    matched_substrings: MatchedSubstring[];
    place_id: string;
    reference: string;
    structured_formatting: StructuredFormatting;
    terms: Term[];
    types: string[];
}

export interface SearchPlacesResult {
    predictions: SearchPlacePrediction[];
    status: string;
}