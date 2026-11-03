/**
 * The association's real details from the paper form. Used ONLY to prefill the
 * first-run setup form. After setup the values live in the database and every
 * screen and printout reads them from there.
 */
export const SETUP_DEFAULTS = {
  association_name: "QIBING TRANSPORT ASSOCIATION",
  short_name: "QIBING TRANSPORT ASS",
  street_address: "No: 02 De Wet Str.",
  town: "Wepener",
  postal_code: "9944",
  cell_no: "068 371 5842",
  email: "Qibingtransportassociation22@gmail.com",
  registration_no: "RASFSA 0333358",
  chairperson_line: "Chairperson Mr. Mpiti: 073 702 9977",
  secretary_line: "Secretary Mphasa: 067 740 7036",
  committee: [
    { role_title: "Chairperson", name: "A.T. Mpiti" },
    { role_title: "Dep. Chairperson", name: "M.A. Makhetha" },
    { role_title: "Secretary", name: "P. Ramathebane" },
    { role_title: "Dep. Secretary", name: "M.V. Ntaka" },
    { role_title: "Treasurer", name: "T.G. Lelala" },
  ],
  route: { name: "Wepener to Johannesburg", from_place: "Wepener", to_place: "Johannesburg" },
  paper_size: "letter",
  child_limit: 3,
} as const;
