/** Everything one printed passenger list needs. Built from live data (drafts, blank forms) or a closed list's snapshot. */
export interface PrintSettings {
  short_name: string;
  street_address: string;
  town: string;
  postal_code: string;
  cell_no: string;
  email: string;
  registration_no: string;
  chairperson_line: string;
  secretary_line: string;
  show_list_reference: boolean;
  paper_size: "letter" | "a4";
}

export interface PrintPassenger {
  full_name: string;
  from_address: string;
  destination_address: string;
  next_of_kin_no: string;
  paid_cents: number;
}

export interface PrintTrip {
  id: string;
  trip_date: string;
  owner_title: "Mr" | "Mrs" | "Ms" | "none";
  owner_name: string;
  registration_no: string;
  driver_name: string;
  route_name: string;
  marshal_name: string;
}

export interface PrintList {
  settings: PrintSettings;
  logoUrl: string;
  /** The faded full logo behind the table; falls back to the letterhead logo. */
  watermarkUrl: string;
  committee: { role_title: string; name: string }[];
  /** null = blank form for handwriting */
  trip: PrintTrip | null;
  adults: PrintPassenger[];
  children: PrintPassenger[];
  isDraft: boolean;
}

/** Rows printed on every sheet, so each sheet is the same size (28, as on the original form). More adults continue on another sheet. */
export const FORM_ADULT_ROWS = 28;
export const FORM_CHILD_ROWS = 3;
